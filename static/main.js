class Database {
    constructor(fullJson) {
        this.moves = fullJson.moves;
        this.abilities = fullJson.abilities;
        this.pokemons = fullJson.pokemons;

        Object.values(fullJson).forEach(o => Object.freeze(o));
    }

    fill(arrayToFill, filters) {
        arrayToFill.length = 0;

        let pkmn = Object.values(this.pokemons);

        if (filters.hideNFE) {
            pkmn = pkmn.filter(pokemon => pokemon.evolvesInto.length === 0);
        }

        if (filters.ability !== '(None)') {
            pkmn = pkmn.filter(pokemon => pokemon.abilities.find(ab => ab === filters.ability) !== undefined);
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
        <select v-model="selected" v-on:change="$emit('picked', selected)">
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
    filters: {
        ability: "(None)"


    }
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

        print: function(e) {
            console.error(e);
        }
    }
});

$.ajax({
        url: "content.json",
        method: "GET",
        dataType: "json",
        success: function(jsonData) {
            vm.$data.database = new Database(jsonData);
            vm.update();
        }
    }
)
