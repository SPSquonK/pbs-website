

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

class Pokedex {
    constructor(keyValueDict) {
        this.knownSpecies = {};

        for (const { id, entries } of keyValueDict) {
            this.knownSpecies[id] = new Pokemon(id, entries);
        }

        PokedexH.learnPreevolutionMoves(this.knownSpecies);
    }

    getPokemonById(name) {
        return Object.values(this.knownSpecies)
            .find(pokemon => pokemon.getId() == name);
    }

    getListOfAllPokemon() {
        return Object.values(this.knownSpecies);
    }


}


function makePokedex(lines) {
    let splitted = lines.reduce((previous, currentLine) => {
        if (currentLine.startsWith("#")) return previous;

        if (currentLine.startsWith("[") && currentLine.endsWith("]")) {
            let current = {
                id: currentLine.substr(1, currentLine.length - 2),
                entries: {}
            };

            previous.groups.push(current);
            previous.current = current;
            return previous;
        }

        const equalsPosition = currentLine.search("=");
        if (equalsPosition === -1) throw Error("Invalid file");

        const key = currentLine.substr(0, equalsPosition);
        const value = currentLine.substr(equalsPosition + 1);

        if (previous.current.entries[key] !== undefined) {
            throw Error(previous.current.id + " has two " + key);
        }

        previous.current.entries[key] = value;

        return previous;
        }, { groups: [], current: undefined }
    );

    return new Pokedex(splitted.groups);
}


module.exports = {
    Pokemon,
    makePokedex
};