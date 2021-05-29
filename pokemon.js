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

class Move {
    static readFromCsv(csvLine) {
        const key = {
            id: parseInt(csvLine[0]),
            name: csvLine[1]
        }

        return [key, new Move(csvLine)];
    }

    constructor(csvLine) {
        this.name = csvLine[2];
        this.bp = parseInt(csvLine[4]);
        this.type = csvLine[5];
        this.side = csvLine[6];
        this.precision = parseInt(csvLine[7]);
        this.pp = parseInt(csvLine[8]);
        this.description = csvLine[13];

        this.tooltip =
`Power: ${this.bp}
Precision: ${this.precision}
Type: ${this.type}
Side: ${this.side}
PP: ${this.pp}

${this.description}
`;
    }

    makeTooltip() {
        return this.tooltip;
    }
}

class Item {
    static readFromCsv(csvLine) {
        return [
            {
                id: parseInt(csvLine[0]),
                name: csvLine[1]
            },
            new Item(csvLine)
        ]
    }

    constructor(csvLine) {
        this.name = csvLine[2];
    }
}

class Ability {
    static readFromCsv(csvLine) {
        return [
            {
                id: parseInt(csvLine[0]),
                name: csvLine[1]
            },
            new Ability(csvLine)
        ];
    }

    constructor(csvLine) {
        this.name = csvLine[2];
        this.description = csvLine[3];
    }

    makeTooltip() {
        return this.description;
    }
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
        this.name = tempPokemon._entries.Name;
        this.id   = tempPokemon._entries.InternalName;
        this.types = tempPokemon.types;
        this.moves     = [...tempPokemon.moves]    .map(move    => moves.name[move]);
        this.abilities = [...tempPokemon.abilities].map(ability => abilities.name[ability]);
        this.hp  = tempPokemon.stats.hp;
        this.att = tempPokemon.stats.att;
        this.def = tempPokemon.stats.def;
        this.spa = tempPokemon.stats.spa;
        this.spd = tempPokemon.stats.spd;
        this.spe = tempPokemon.stats.spe;

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
    static /* PokemonsBuilder */ initializeFromIni(iniContent) {
        let builder = new PokemonsBuilder();
        
        builder._ = Mappings.fromIni(
            "pokemons", iniContent, _PokemonsBuilderPokemon.readFromInitialIni
        );

        return builder;
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

    addMoves(documentType, content) {
        if (documentType == "tms") {
            const movesToTeach = PokemonsBuilder.tmContentToTodoList(content);

            for (const [pokemonInternalName, moves] of Object.entries(movesToTeach)) {
                this._.name[pokemonInternalName].learnMoves(moves);
            }
        } else {
            throw Error("Unknown move type " + documentType);
        }

        return this;
    }

    applyEvolutionClosure() {
        const allByNames = this._.byNames();
        this._.all().forEach(pokemon => pokemon.determineEvolutions(allByNames));

        let stable;
        do {
            stable = true;

            for (const pokemon of this._.all()) {
                let myMoves = pokemon.moves;

                for (const evolution of pokemon.evolutions) {
                    const before = evolution.moves.size;
                    evolution.moves.add(...myMoves);
                    const after = evolution.moves.size;
                    if (before !== after) stable = false;
                }
            }

        } while (!stable);

        return this;
    }

    getPokemons(moves, abilities) {
        return this._.convert(tempPkmn => new Pokemon(tempPkmn, moves, abilities));
    }
}

class PBS {
    constructor(pbsDict) {
        this._moves = Mappings.fromCSV("Moves", pbsDict.moves, Move.readFromCsv);
        this._items = Mappings.fromCSV("Items", pbsDict.items, Item.readFromCsv);
        this._abilities = Mappings.fromCSV("Abilities", pbsDict.abilities, Ability.readFromCsv);

        this._pokemons = PokemonsBuilder.initializeFromIni(pbsDict.pokemon)
            .addMoves("tms", pbsDict.tm)
            .applyEvolutionClosure()
            .getPokemons(this._moves, this._abilities);
    }

    getPokedex() { return this._pokemons; }


}


module.exports = {
    Pokemon,
    PBS
};