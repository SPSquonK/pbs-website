const Papa = require('papaparse');
const INI = require('ini');
const fs = require('fs');

function _reduceInDict(dict, object) {
    dict[object['@id']] = object;
    return dict;
}

////////////////////////////////////////////////////////////////////////////////
//  - CSV - CSV - CSV - CSV - CSV - CSV - CSV - CSV - CSV - CSV - CSV - CSV -

function readCSVData(csvContent, lineReader) {
    const parsingResult = Papa.parse(csvContent);

    parsingResult.errors = parsingResult.errors.filter(e => e.type !== 'Quotes');

    if (parsingResult.errors.length !== 0) {
        console.error(parsingResult.errors);
        throw Error("Failed csv content to mapping");
    }

    return parsingResult.data.map(lineReader).reduce(_reduceInDict, {});
}

function readMove(csvLine) {
    return {
        '@id': csvLine[1],
        name : csvLine[2],
        bp : parseInt(csvLine[4]),
        type : csvLine[5],
        side : csvLine[6],
        precision : parseInt(csvLine[7]),
        pp : parseInt(csvLine[8]),
        description : csvLine[13]
    };
}

function readItem(csvLine) {
    return {
        '@id': csvLine[1],
        name: csvLine[2]
    }
}

function readAbility(csvLine) {
    return {
        '@id': csvLine[1],
        name: csvLine[2],
        description: csvLine[3]
    }
}

////////////////////////////////////////////////////////////////////////////////
//  - INI - INI - INI - INI - INI - INI - INI - INI - INI - INI - INI - INI -

function readINIData(iniContent, entryReader) {
    return Object.entries(INI.parse(iniContent)).map(entryReader).reduce(_reduceInDict, {});
}

function readPokemon([dexNumber, entries]) {
    let result = {
        '@id': entries.InternalName,
        name: entries.Name,
        types: [],
        moves: {},
        abilities: [],
        hp: undefined,
        att: undefined,
        def: undefined,
        spa: undefined,
        spd: undefined,
        spe: undefined,
        evolvesInto: [],
        form: [parseInt(dexNumber), 0]
    };

    function addAbility(abilities) {
        if (abilities === undefined) return;
        abilities.split(",")
            .filter(s => s != "")
            .forEach(ability => result.abilities.push(ability))
    }

    addAbility(entries.Abilities);
    addAbility(entries.HiddenAbility);

    if (entries.Type1 !== undefined) result.types.push(entries.Type1);
    if (entries.Type2 !== undefined) result.types.push(entries.Type2);

    (() => {
        const stats = entries.BaseStats.split(",");
        result.hp  = parseInt(stats[0]);
        result.att = parseInt(stats[1]);
        result.def = parseInt(stats[2]);
        result.spa = parseInt(stats[4]);
        result.spd = parseInt(stats[5]);
        result.spe = parseInt(stats[3]);
    })();

    function addMove(name, method) {
        if (result.moves[name] === undefined) {
            result.moves[name] = [];
        }

        result.moves[name].push(method);
    }

    if (entries.Moves !== undefined) {
        let moves = entries.Moves.split(",");

        for (let i = 0 ; i + 2 <= moves.length ; i += 2) {
            let method = moves[i] === '0' ? 'Evolution' : parseInt(moves[i]);
            const name = moves[i + 1];

            addMove(name, method);
        }
    }

    if (entries.EggMoves !== undefined) {
        entries.EggMoves.split(",")
            .filter(s => s != '')
            .forEach(move => addMove(move, "EggMove"));
    }

    if (entries.Evolutions !== undefined && entries.Evolutions !== "") {
        let s = entries.Evolutions.split(",");

        for (let i = 0 ; i < s.length ; i += 3) {
            result.evolvesInto.push(s[i]);
        }
    }

    return result;
}


class PokemonsBuilder {
    static make(ini, tm) {
        return this._pokemons = new PokemonsBuilder(readINIData(ini, readPokemon))
            .addTMMoves(tm)
            .applyEvolutionClosure()
            .simplifyTMs()
            ._;
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
        if (content === undefined) return this;

        const movesToTeach = PokemonsBuilder.tmContentToTodoList(content);

        for (const [pokemonInternalName, moves] of Object.entries(movesToTeach)) {
            if (this._[pokemonInternalName] === undefined)
                continue;
            moves.forEach(move => PokemonsBuilder.teachMove(this._[pokemonInternalName], move, "TM"));
        }

        return this;
    }

    applyEvolutionClosure() {
        let stable;
        do {
            stable = true;

            for (const pokemon of Object.values(this._)) {
                let myMoves = Object.keys(pokemon.moves);

                for (const evolutionName of pokemon.evolvesInto) {
                    const evolution = this._[evolutionName];

                    myMoves.forEach(move => {
                        if (evolution.moves[move] === undefined) {
                            evolution.moves[move] = ["Preevolution"]
                            stable = false;
                        }
                    });
                }
            }

        } while (!stable);

        return this;
    }

    simplifyTMs() {
        Object.values(this._)
            .forEach(pokemon => pokemon.moves = Object.keys(pokemon.moves));

        return this;
    }
}

////////////////////////////////////////////////////////////////////////////////

/** Loads the file at the given path */
function pbsFilePathToLines(path) {
    return fs.readFileSync(path, "utf-8")
        // Remove BOM
        .replace(/^\uFEFF/, '')
        // Split
        .split(/\r?\n/)
        // Remove empty lines and comments
        .filter(s => s != '' && !s.startsWith("#"))
        // As we are using libraries to parse the content, we rebuild an unique
        // string
        .join("\n");
}

module.exports = {
    readCSVMoves: csv => readCSVData(csv, readMove),
    readCSVItems: csv => readCSVData(csv, readItem),
    readCSVAbilities: csv => readCSVData(csv, readAbility),
    buildPokemonList: (ini, tms) => PokemonsBuilder.make(ini, tms),
    pbsFilePathToLines
};

