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


class Pokemon {
    static readFromInitialIni(iniKey, entries) {
        return [
            {
                id: parseInt(iniKey),
                name: entries.InternalName
            },
            new Pokemon(iniKey, entries)
        ];
    }

    constructor(id, entries) {
        this._id = id;
        this._entries = entries;
        this._abilities = PkmnH.makeAbilities(entries.Abilities, entries.HiddenAbility);
        this._moves = PkmnH.makeMoves({
            learned: entries.Moves,
            other: [entries.EggMoves]
        });

    }

    getName() { return this._entries.Name; }
    getId() { return this._entries.InternalName; }
    getTypes() {
        let types = [];
        if (this._entries.Type1 !== undefined) types.push(this._entries.Type1);
        if (this._entries.Type2 !== undefined) types.push(this._entries.Type2);
        return types;
    }

    getMoves() { return [...this._moves]; }

    getAbilities() { return this._abilities; }

    getEvolutions() {
        if (this._entries.Evolutions === undefined) return [];
        if (this._entries.Evolutions === "") return [];
        let s = this._entries.Evolutions.split(",");

        let result = [];
        for (let i = 0 ; i < s.length ; i += 3) {
            result.push(s[i]);
        }
        return result;
        
    }
    
    learnMoves(newMoves) {
        newMoves.forEach(move => this._moves.add(move));
    }

}

const PokedexH = {
    /* Teach TM moves + run the evolution closure */
    completeMoves: function(pokemonsMapping, tmContent) {
        const movesToTeach = PokedexH.tmContentToTodoList(tmContent);

        for (const [pokemonInternalName, moves] of Object.entries(movesToTeach)) {
            pokemonsMapping.name[pokemonInternalName].learnMoves(moves);
        }

        PokedexH.learnPreevolutionMoves(pokemonsMapping.byNames());
    },

    learnPreevolutionMoves: function(pokemons) {
        // Find evolutions
        let evolutions = {}; // id evolves into => list

        for (const [id, pkmn] of Object.entries(pokemons)) {
            evolutions[id] = pkmn.getEvolutions().map(evoId => {
                let r = pokemons[evoId]
                if (r === undefined) {
                    console.error(pokemons);
                    throw Error("Noone is named " + evoId);
                }
                return r;
            });
        }

        // Closure
        let stable;
        do {
            stable = true;

            for (const [preevolutionId, myEvolutions] of Object.entries(evolutions)) {
                let myMoves = pokemons[preevolutionId].getMoves();

                for (const evolution of myEvolutions) {
                    const before = evolution.getMoves().length;
                    evolution.learnMoves(myMoves);
                    const after = evolution.getMoves().length;
                    if (after !== before) stable = false;
                }
            }

        } while (!stable);
    },

    tmContentToTodoList: function (tmContent) {
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

};


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
    }

    all() {
        return Object.values(this[this.firstKey]);
    }
}


class PBS {
    constructor(pbsDict) {
        this._moves = Mappings.fromCSV("Moves", pbsDict.moves, Move.readFromCsv);
        this._items = Mappings.fromCSV("Items", pbsDict.items, Item.readFromCsv);
        this._abilities = Mappings.fromCSV("Abilities", pbsDict.abilities, Ability.readFromCsv);
        this._pokemons = Mappings.fromIni("Pokemons", pbsDict.pokemon, Pokemon.readFromInitialIni);
        PokedexH.completeMoves(this._pokemons, pbsDict.tm);


        // TODO: learn all moves
    }

    getPokedex() { return this._pokemons; }


}


module.exports = {
    Pokemon,
    PBS
};