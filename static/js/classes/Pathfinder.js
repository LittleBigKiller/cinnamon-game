class Pathfinder {

    static createMatrix(dbfile) {
        let size = dbfile.size
        let map = dbfile.level
        let matrix = []
        for (var cell in map) {
            if (cell % size == 0) {
                matrix.push([])
            }
            switch (map[cell].type) {
                case "dirt":
                    matrix[matrix.length - 1].push([0, parseInt(map[cell].height)])
                    break
    
                case "rock":
                    matrix[matrix.length - 1].push([1, parseInt(map[cell].height)])
                    break
            }
    
        }
        console.log("KeK");
    
        return matrix
    }

    static moveTiles(result, matrix, unitPosition, unit) {
        if (result.length > 1) {
            var movePath = result
            //movePath.shift()
            let move = 0
            let moveInterval = setInterval(() => {
                unitPosition.z = movePath[move][1]
                unitPosition.x = movePath[move][0]
                unitPosition.height = matrix[unitPosition.z][unitPosition.x].position.y
                unit.mesh.position.set(unitPosition.x * Settings.tileSize, unitPosition.height ,unitPosition.z * Settings.tileSize)
                matrix[unitPosition.z][unitPosition.x].material.color.set(0xff0000)
                move++
                if (move > movePath.length - 1) {
                    window.clearInterval(moveInterval)                    
                    setTimeout(() => {
                        for (let move in movePath) {
                            matrix[movePath[move][1]][movePath[move][0]].material.color.set(Settings.dirtTileColor)
                        }
                    }, 1000)
                }
            }, 500)
        }
        console.log("Your units path is: " + movePath)

    }

}