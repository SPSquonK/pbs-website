const fs = require('fs');
const express = require('express');
const pug = require('pug');

const port = typeof(PhusionPassenger) !== 'undefined' ? 'passenger' : 3000;

const pokemons = require('./pokemon.js');

const pkmn = fs.readFileSync("resource/pokemon.txt", "utf-8").split(/\r?\n/);
const pokedex = pokemons.makePokedex(pkmn);


const app = express();

app.listen(port, () => console.log("Server started on http://localhost:" + port + "/"));

const templates = {
    pokemonList: pug.compileFile("pug_templates/pokemon_list.pug")

};



app.get("/", (_, res) => {
    return res.send(
        templates.pokemonList({
            pokemonList: pokedex.getListOfAllPokemon()
        })
    );
});


