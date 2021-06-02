require('dotenv').config();
const fs = require('fs');
const DatabaseBuilder = require('./_database-builder.js');
const SpritesheetBuilder = require('./_spritesheet-builder.js');
const stringify = require("json-stringify-pretty-compact");

/** Loads  */
function _buildPbsReading() {
    const listOfFiles = [
        'abilities', 'encounters', 'items', 'moves',
        'pokemon', 'pokemonforms', 'tm', 'types'
    ];

    const result = {};

    for (let filename of listOfFiles) {
        try {
            result[filename] = DatabaseBuilder.pbsFilePathToLines(process.env.RESOURCES_PATH + "/" + filename + ".txt");
        } catch (e) {
            result[filename] = undefined;
        }
    }

    try {
        result.directives = JSON.parse(fs.readFileSync(process.env.RESOURCES_PATH + "/directives.json", "utf-8"));
    } catch (e) {
        result.directives = undefined;
    }

    return result;
}

function readPBS() {
    const pbsDict = _buildPbsReading();

    let content = {};

    content.moves     = DatabaseBuilder.readCSVMoves(pbsDict.moves);    
    content.items     = DatabaseBuilder.readCSVItems(pbsDict.items);
    content.abilities = DatabaseBuilder.readCSVAbilities(pbsDict.abilities);
    content.pokemons  = DatabaseBuilder.buildPokemonList(pbsDict.pokemon, pbsDict.tm, pbsDict.pokemonforms, pbsDict.directives);

    {
        function findIcon(pokemon) {
            const path = process.env.ICONS_PATH + "/icon";

            let candidates = [];

            if (pokemon['@form'] !== 0) {
                candidates.push(path + ("" + pokemon['dexNumber']).padStart(3, "0") + "_" + pokemon['@form'] + ".png");
            }

            candidates.push(path + ("" + pokemon['dexNumber']).padStart(3, "0") + ".png");
            candidates.push(path + "icon000.png");

            for (const candidate of candidates) {
                try {
                    if (fs.existsSync(candidate)) {
                        return candidate;
                    }
                } catch (err) {}
            }

            return undefined;
        }

        const requests = {};
        let lastIndex = 0;

        for (const [_key, pokemon] of Object.entries(content.pokemons)) {
            const imageCandidate = findIcon(pokemon);

            if (imageCandidate !== undefined) {
                if (requests[imageCandidate] !== undefined) {
                    pokemon.iconNumber = requests[imageCandidate];
                } else {
                    requests[imageCandidate] = lastIndex;
                    pokemon.iconNumber = lastIndex;
                    ++lastIndex;
                }
            }
        }

        if (requests.length !== 0) {
            SpritesheetBuilder(Object.keys(requests));
            content.icons = true;
        }
    }


    return content;
}

function removeMetaTags(content) {
    if (typeof content === 'object') {
        Object.keys(content)
            .filter(key => key.startsWith("@"))
            .forEach(key => delete content[key]);
        
        Object.values(content)
            .forEach(value => removeMetaTags(value));
    }
}

function compilePBS() {
    let c = readPBS();
    removeMetaTags(c);
    return stringify(c);
}

let args = process.argv.slice(2);

if (args.length === 0) args = ['-p', 'static/content.json'];

if (args.length === 2 && (args[0] === '-p' || args[0] === '--path')) {
    const pbs = compilePBS();
    fs.writeFileSync(args[1], pbs);
} else if (args.length === 1 && (args[0] === '-c' || args[0] === '--console')) {
    console.log(compilePBS());
} else {
    console.log("Argument must be either -p [path] or -c");
}
