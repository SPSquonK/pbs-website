# PBS Website

This is a website that exposes the content of the PBS files.

Code is really bad because I'm learning Vue.js.


## Compile the resources

- `npm install`
- Put the PBS files somewhere (best place being in a resource folder created
here)
- run `node compilation\convert-resources.js`


To get started, you can download some PBS files at this url
https://reliccastle.com/resources/383/ and unzip the PBS folder in a folder
named `Resources` here.

## Run the website

- Run a server, for example:
    - `npm install -g http-server`
    - `http-server` 
- Go to http://localhost:8000/static/index.html 


## TODO

- Forms
- Filters (finish it)
    - Similar moves / abilities
    - Groups of abilities (to be able to look for sleep inducers)
    - Groups of abilities (group by type / category)
- Stat filters
- Sort
