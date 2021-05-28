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
    learnPreevolutionMoves: function(pokemons) {
        let evolutions = {}; // id evolves into => list

        for (const [id, pkmn] of Object.entries(pokemons)) {
            evolutions[id] = pkmn.getEvolutions().map(id => {
                let r = Object.values(pokemons).find(pkmn => pkmn.getId() === id)
                if (r === undefined) console.error("Noone is named " + id);
                return r;
            });
        }

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

            this["by" + capitalize(key) + "s"] = () => Object.values(this[key]);
        }
    }
}


class PBS {
    constructor(pbsDict) {
        this._moves = Mappings.fromCSV("Moves", pbsDict.moves, Move.readFromCsv);
        this._items = Mappings.fromCSV("Items", pbsDict.items, Item.readFromCsv);
        this._abilities = Mappings.fromCSV("Abilities", pbsDict.abilities, Ability.readFromCsv);
        this._pokemons = Mappings.fromIni("Pokemons", pbsDict.pokemon, Pokemon.readFromInitialIni);
        // TODO: learn all moves
    }

    getPokedex() { return this._pokemons; }


}


module.exports = {
    Pokemon,
    PBS
};