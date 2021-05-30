const Papa = require('papaparse');
const INI = require('ini');

function _reduceInDict(dict, object) {
    dict[object['@id']] = object;
    return dict;
}

////////////////////////////////////////////////////////////////////////////////
//  - CSV - CSV - CSV - CSV - CSV - CSV - CSV - CSV - CSV - CSV - CSV - CSV -

function readCSVData(csvContent, lineReader) {
    const parsingResult = Papa.parse(csvContent);

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
    return Object.values(INI.parse(iniContent)).map(entryReader).reduce(_reduceInDict, {});
}

function readPokemon(entries) {
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
        evolvesInto: []
    };

    function addAbility(abilities) {
        if (abilities === undefined) return;
        abilities.split(",")
            .filter(s => s != "")
            .forEach(ability => result.abilities.push(ability))
    }

    addAbility(entries.Abilities);
    addAbility(entries.HiddenAbility);

    if (entries.Type1 !== 'undefined') result.types.push(entries.Type1);
    if (entries.Type2 !== 'undefined') result.types.push(entries.Type2);

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

    if (entries.Evolution !== undefined && this._entries.Evolutions !== "") {
        let s = entries.Evolutions.split(",");

        for (let i = 0 ; i < s.length ; i += 3) {
            result.evolvesInto.push(s[i]);
        }
    }

    return result;
}


module.exports = {
    readCSVMoves: csv => readCSVData(csv, readMove),
    readCSVItems: csv => readCSVData(csv, readItem),
    readCSVAbilities: csv => readCSVData(csv, readAbility),
    readINIPokemon: ini => readINIData(ini, readPokemon)
};

