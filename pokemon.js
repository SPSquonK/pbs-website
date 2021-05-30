const DatabaseBuilder = require('./database_builder.js');

const Papa = require('papaparse');
const ini = require('ini');

const capitalize = (s) => {
    if (typeof s !== 'string') return ''
    return s.charAt(0).toUpperCase() + s.slice(1);
}
  

const PkmnH = {
    makeAbilities: function(regular, hidden) {
        let list = [];

        function add(s) {
            if (s === undefined) return;
            s.split(",").filter(s => s != "").forEach(s => list.push(s));
        }

        add(regular);
        add(hidden);

        return list;
    },

    makeMoves: function(e) {
        let moves = new Set();

        if (e.learned !== undefined) {
            let s = e.learned.split(",");
            let x = [];

            for (let i = 1 ; i < s.length ; i += 2) {
                x.push(s[i]);
            }

            x.forEach(move => moves.add(move));
        }

        e.other
         .filter(strList => strList !== undefined)
         .map(strList => strList.split(","))
         .forEach(learnedMoves => learnedMoves.forEach(move => moves.add(move)));

        return moves;
    }

}


function getMoveTooltip(move) {
    return `Power: ${move.bp}`
        + `Precision: ${move.precision}\n`
        + `Type: ${move.type}\n`
        + `Side: ${move.side}\n`
        + `PP: ${move.pp}\n`
        + `\n`
        + `${move.description}`;
}


class Mappings {
    static fromCSV(name, csvContent, csvLineToObject) {
        const parsingResult = Papa.parse(csvContent);
    
        if (parsingResult.errors.length !== 0) {
            console.error(parsingResult.errors);
            throw Error("Failed csv content to mapping " + name);
        }
    
        const objects = parsingResult.data.map(csvLineToObject)
        return new Mappings(name, objects);
    }

    static fromIni(name, iniContent, iniDictToObject) {
        const parsing = ini.parse(iniContent);
        const objects = Object.entries(parsing).map(entry => iniDictToObject(entry[0], entry[1]));
        return new Mappings(name, objects);
    }

    constructor(name, objects) {
        if (objects.length === 0) throw Error(`Mapping ${name} is empty`);
        this.name = name;

        const keys = Object.keys(objects[0][0]);
        for (const key of keys) {
            this[key] = {};

            for (const [objectKey, object] of objects) {
                this[key][objectKey[key]] = object;
            }

            this["by" + capitalize(key) + "s"] = () => this[key];
        }

        this.firstKey = keys[0];

        this.objs = objects;
    }

    all() {
        return Object.values(this[this.firstKey]);
    }

    convert(predicate) {
        return new Mappings(
            this.name,
            this.objs.map(obj => [obj[0], predicate(obj[1])])
        )
    }
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

class _PokemonsBuilderPokemon {
    static readFromInitialIni(iniKey, entries) {
        return [
            {
                id: parseInt(iniKey),
                name: entries.InternalName
            },
            new _PokemonsBuilderPokemon(iniKey, entries)
        ];
    }

    static makeTypes(entries) {
        let types = [];
        if (entries.Type1 !== undefined) types.push(entries.Type1);
        if (entries.Type2 !== undefined) types.push(entries.Type2);
        return types;
    }

    constructor(iniKey, entries) {
        this._id = iniKey;
        this._entries = entries;

        this.abilities = PkmnH.makeAbilities(entries.Abilities, entries.HiddenAbility);
        this.moves = PkmnH.makeMoves({
            learned: entries.Moves, other: [entries.EggMoves]
        });

        const stats = entries.BaseStats.split(",");
        this.stats = {
            hp: parseInt(stats[0]),
            att: parseInt(stats[1]),
            def: parseInt(stats[2]),
            spa: parseInt(stats[4]),
            spd: parseInt(stats[5]),
            spe: parseInt(stats[3])
        };

        this.types = _PokemonsBuilderPokemon.makeTypes(entries);
    }

    determineEvolutions(pokemonListByNames) {
        if (this._entries.Evolutions === undefined || this._entries.Evolutions === "") {
            this.evolutions = [];
            return;
        }
        
        let s = this._entries.Evolutions.split(",");

        let result = [];
        for (let i = 0 ; i < s.length ; i += 3) {
            result.push(s[i]);
        }

        let pkmn = result.map(id => pokemonListByNames[id]);
        if (pkmn.some(pkmn => pkmn === undefined)) throw Error(":(");
        this.evolutions = pkmn;
    }

    learnMoves(moveList) {
        moveList.forEach(move => this.moves.add(move));
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
