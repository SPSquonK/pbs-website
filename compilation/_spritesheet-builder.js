const fs  = require("fs");
const PNG = require("pngjs").PNG;

const SPRITE_SIZE = 64;

function buildNewSpritesheet(images, destination = "static/sprites.png", IMAGES_PER_ROW = 12) {
    const rows = Math.ceil(images.length / IMAGES_PER_ROW);

    const result = new PNG({
        width: SPRITE_SIZE * IMAGES_PER_ROW,
        height: rows * SPRITE_SIZE,
        inputHasAlpha: true
    });

    let x = 0;
    function finish() {
        ++x;

        if (x === images.length) {
            result.pack().pipe(fs.createWriteStream(destination));
        }
    }

    for (const [id, image] of Object.entries(images)) {
        fs.createReadStream(image)
            .pipe(new PNG({ filterType: 4 }))
            .on("parsed", function() {
                const resultRow = Math.floor(id / IMAGES_PER_ROW);
                const resultColumn = id % IMAGES_PER_ROW;
                const offset = (resultRow * result.width + resultColumn) * SPRITE_SIZE;
                
                for (let y = 0 ; y < SPRITE_SIZE ; ++y) {
                    for (let x = 0 ; x < SPRITE_SIZE ; ++x) {
                        const original = (this.width * y + x) << 2;
                        const target = (offset + result.width * y + x) << 2;

                        for (let i = 0 ; i != 4 ; ++i) {
                            result.data[target + i] = this.data[original + i];
                        }
                    }
                }

                finish();
            });
    }
}

module.exports = buildNewSpritesheet;