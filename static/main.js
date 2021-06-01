/**
 * @param {string[]} array1 
 * @param {string[]} array2 
 */
function findOneCommonElement(array1, array2) {
    return array1.find(e1 => array2.indexOf(e1) !== -1);
}

class Database {
    constructor(fullJson) {
        this.moves = fullJson.moves;
        this.abilities = fullJson.abilities;
        this.pokemons = fullJson.pokemons;
        this.similarAbilities = {};

        Object.values(fullJson).forEach(o => Object.freeze(o));
    }

    loadSimilar(similars) {
        const add = (baseAbility, similarAbility) => {
            if (this.similarAbilities[baseAbility] === undefined) {
                this.similarAbilities[baseAbility] = [];
            }

            this.similarAbilities[baseAbility].push(similarAbility);
        };

        for (const equivalenceClass of similars.similar_abilities) {
            console.error(equivalenceClass)
            for (let i = 0 ; i < equivalenceClass.length ; ++i) {
                for (let j = i + 1 ; j < equivalenceClass.length ; ++j) {
                    add(equivalenceClass[i], equivalenceClass[j]);
                    add(equivalenceClass[j], equivalenceClass[i]);
                }
            }
        }

        let addSuperior = (superiorClass, element) => {
            add(element, superiorClass);
    
            for (const equivalent of this.similarAbilities[element]) {
                add(equivalent, superiorClass);
            }
        }

        for (const [superiorClass, elements] of Object.entries(similars.better_abilities)) {
            if (typeof elements === 'string') {
                addSuperior(superiorClass, elements);
            } else {
                for (const element of elements) {
                    addSuperior(superiorClass, element);
                }
            }
        }
    }

    fill(arrayToFill, filters) {
        arrayToFill.length = 0;

        let pkmn = Object.values(this.pokemons);

        if (filters.hideNFE) {
            pkmn = pkmn.filter(pokemon => pokemon.evolvesInto.length === 0);
        }

        if (filters.ability !== undefined && filters.ability !== '(None)') {
            let searchedAbilities = [filters.ability];
            let equivalent = this.similarAbilities[filters.ability];
            
            if (equivalent !== undefined) {
                searchedAbilities.push(...equivalent);
            }

            pkmn = pkmn.filter(pokemon => findOneCommonElement(pokemon.abilities, searchedAbilities) !== undefined);
        }

        for (const move of [filters.move1, filters.move2, filters.move3, filters.move4]) {
            if (move !== undefined && move !== '(None)') {
                pkmn = pkmn.filter(pokemon =>
                    pokemon.moves.find(mv => mv === move) !== undefined
                    || pokemon.moves.indexOf('SKETCH') !== -1
                );
            }
        }

        pkmn.forEach(pokemon => arrayToFill.push(pokemon));
    }
}


/*

function getMoveTooltip(move) {
    return `Power: ${move.bp}`
        + `Precision: ${move.precision}\n`
        + `Type: ${move.type}\n`
        + `Side: ${move.side}\n`
        + `PP: ${move.pp}\n`
        + `\n`
        + `${move.description}`;
}

class Pokemon {
    constructor(tempPokemon, moves, abilities) {
        this.name = tempPokemon.name;
        this.id   = tempPokemon['@id'];
        this.types = tempPokemon.types;
        this.moves     = Object.keys(tempPokemon.moves).map(move    => moves[move]);
        this.abilities = [...tempPokemon.abilities].map(ability => abilities[ability]);
        this.hp  = tempPokemon.hp;
        this.att = tempPokemon.att;
        this.def = tempPokemon.def;
        this.spa = tempPokemon.spa;
        this.spd = tempPokemon.spd;
        this.spe = tempPokemon.spe;

        Object.freeze(this);
    }
}

class PBS {
    static fromPBSFiles(pbsDict) {
        const self = new PBS();

        self._moves     = DatabaseBuilder.readCSVMoves(pbsDict.moves);
        Object.values(self._moves).forEach(move => move['@tooltip'] = getMoveTooltip(move));
        
        self._items     = DatabaseBuilder.readCSVItems(pbsDict.items);
        self._abilities = DatabaseBuilder.readCSVAbilities(pbsDict.abilities);
        self._pokemons  = Object.entries(DatabaseBuilder.buildPokemonList(pbsDict.pokemon, pbsDict.tm))
            .reduce(
                (dict, [id, tempPokemon]) => {
                    dict[id] = new Pokemon(tempPokemon, self._moves, self._abilities)
                    return dict;
                }, {}
            );
        
        return self;
    }
    
    getPokedex() { return this._pokemons; }
}

*/


Vue.component('list-picker', {
    data: function() { return { selected: '(None)' }; },
    props: ['elements', 'none', 'label'],
    template:
    `
    <div class="field">
      <label class="label">{{ label }}</label>
      <div class="select">
        <select v-model="selected" v-on:change="$emit('input', selected)" class="reseted-by-reset">
          <option value="(None)" selected>
            {{ none }}
          </option>
          <option v-for="(element, id) in elements" v-bind:value="id">
            {{ element.name }}
          </option>
        </select>
      </div>
    </div>
    `
});


const data = {
    database: new Database({ moves: {}, abilities: {}, pokemons: {} }),
    pokemons: [],
    filters: {}
};

const vm = new Vue({
    el: "#vue-app",
    data: data,
    methods: {
        update: function() {
            this.$data.pokemons.length = 0;
            this.$data.database.fill(
                this.$data.pokemons,
                this.$data.filters
            );
        },

        newAbilitySelection: function() {
            this.update();
        },

        reset: function() {
            document.querySelector(".reseted-by-reset [value=\"(None)\"]").selected = true;
            this.$data.filters.ability = "(None)";
            this.$data.filters.move1   = "(None)";
            this.$data.filters.move2   = "(None)";
            this.$data.filters.move3   = "(None)";
            this.$data.filters.move4   = "(None)";
            this.update();
        }
    }
});


(() => {
    const content = $.ajax({
        url: 'content.json',
        method: 'GET',
        dataType: 'json'
    });

    const similars = $.ajax({
        url: 'similars.json',
        method: 'GET',
        dataType: 'json'
    });

    $.when(content, similars).done((content, similars) => {
        vm.$data.database = new Database(content[0]);
        vm.$data.database.loadSimilar(similars[0]);
        vm.update();
    });
})();

