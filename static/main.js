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
            let first = true;
            pkmn = pkmn.filter(pokemon => {
                if (first) console.error(pokemon);
                first = false;
                console.error(pokemon.name);
                console.log(pokemon.evolvesInto);
                return pokemon.evolvesInto.length === 0;
            });
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

const data = {
    database: null,
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
