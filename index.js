const fs = require('fs');
const express = require('express');
const pug = require('pug');

const port = typeof(PhusionPassenger) !== 'undefined' ? 'passenger' : 3000;

const pokemons = require('./pokemon.js');

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

function buildPbsReading() {
    const listOfFiles = [
        'abilities', 'encounters', 'items', 'moves',
        'pokemon', 'pokemonforms', 'tm', 'types'
    ];

    const result = {};

    for (let filename of listOfFiles) {
        result[filename] = pbsFilePathToLines('resource/' + filename + ".txt");
    }

    return result;
}


const pbs = new pokemons.PBS(buildPbsReading());

const pokedex = pbs.getPokedex();


const app = express();

app.listen(port, () => console.log("Server started on http://localhost:" + port + "/"));

const templates = {
    main: pug.compileFile("pug_templates/main.pug"),
    pokemonList: pug.compileFile("pug_templates/pokemon_list.pug")

};



app.get("/", (_, res) => {
    return res.send(
        templates.main({ content : 
            templates.pokemonList({
                pokemonList: Object.values(pokedex).slice(0, 10)
            })
        })
    );
});


