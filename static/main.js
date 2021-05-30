
const vueApp = new Vue({
    e1: "#vue-app",
    data: {
        pokemons: []
    }
});


setTimeout(
    function() {

        vueApp.data.pokemons = [
            {
                name: "Rayquaza"
            }
        ];
    },
    5000
)

//$.ajax({
//        url: "pokemons",
//        method: "GET",
//        dataType: "json",
//        success: function() {
//            vueApp.data.pokemons
//        }
//    }
//)