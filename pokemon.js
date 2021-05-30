const DatabaseBuilder = require('./database_builder.js');

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

class PokemonsBuilder {
    static initializeFromIni(iniContent) {
        return new PokemonsBuilder(DatabaseBuilder.readINIPokemon(iniContent));
    }

    constructor(initialSet) {
        this._ = initialSet;
    }

    static tmContentToTodoList(tmContent) {
        const lines = tmContent.split("\n");

        const movesToTeach = {};

        let currentMove = undefined;
        for (const line of lines) {
            if (line.startsWith("[") && line.endsWith("]")) {
                currentMove = line.substr(1, line.length - 2);
            } else {
                if (currentMove === undefined)
                    throw Error("Invalid tm.txt file");
                
                line.split(",")
                    .filter(s => s !== '')
                    .forEach(pokemonInternalName => {
                        if (movesToTeach[pokemonInternalName] === undefined) {
                            movesToTeach[pokemonInternalName] = [];
                        }

                        movesToTeach[pokemonInternalName].push(currentMove);
                    });
            }
        }

        return movesToTeach;
    }

    static teachMove(pokemon, name, method) {
        if (pokemon.moves[name] === undefined) {
            pokemon.moves[name] = [];
        }
        
        pokemon.moves[name].push(method);
    }

    addTMMoves(content) {
        const movesToTeach = PokemonsBuilder.tmContentToTodoList(content);

        for (const [pokemonInternalName, moves] of Object.entries(movesToTeach)) {
            moves.forEach(move => PokemonsBuilder.teachMove(this._[pokemonInternalName], move, "TM"));
        }

        return this;
    }

    applyEvolutionClosure() {
        let stable;
        do {
            stable = true;

            for (const pokemon of Object.values(this._)) {
                let myMoves = Object.values(pokemon.moves);

                for (const evolutionName of pokemon.evolvesInto) {
                    const evolution = this._[evolutionName];

                    myMoves.forEach(move => {
                        if (evolution.moves[move] === undefined) {
                            evolution.moves[move] = ["Preevolution"]
                            stable = false;
                        }
                    })
                }
            }

        } while (!stable);

        return this;
    }

    getPokemons(moves, abilities) {
        return Object.entries(this._)
            .reduce(
                (dict, [id, tempPokemon]) => {
                    dict[id] = new Pokemon(tempPokemon, moves, abilities)
                    return dict;
                }, {}
            );
    }
}

class PBS {
    constructor(pbsDict) {
        this._moves     = DatabaseBuilder.readCSVMoves(pbsDict.moves);
        Object.values(this._moves).forEach(move => move['@tooltip'] = getMoveTooltip(move));
        
        this._items     = DatabaseBuilder.readCSVItems(pbsDict.items);
        this._abilities = DatabaseBuilder.readCSVAbilities(pbsDict.abilities);

        this._pokemons = PokemonsBuilder.initializeFromIni(pbsDict.pokemon)
            .addTMMoves(pbsDict.tm)
            .applyEvolutionClosure()
            .getPokemons(this._moves, this._abilities);
    }

    getPokedex() { return this._pokemons; }


}


module.exports = {
    Pokemon,
    PBS
};
