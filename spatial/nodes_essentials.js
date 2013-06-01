function(doc) {
    var time = new Date();
    var updatetime = new Date(doc.lastupdate)
    var timediff = time.getTime() - updatetime.getTime()
	
    if (doc.type=='node' && doc.longitude && doc.latitude && timediff <= 8640000) {
        var antennas = [];
        if (doc.interfaces) {
            for (var i=0; i<doc.interfaces.length; i++) {
                if (doc.interfaces[i].antenna) {
                    antennas.push({
                        direction: doc.interfaces[i].antenna.direction,
                        beamH: doc.interfaces[i].antenna.beamH
                    });
                }
            }
        }
        var neighbors = [];
        if (doc.neighbors) {
            for (var i=0; i<doc.neighbors.length; i++) {
                if (doc.neighbors[i].id) {
                    var neigh = { id: doc.neighbors[i].id };
                    if (doc.neighbors[i].quality) {
                       neigh["quality"] = doc.neighbors[i].quality;
                    }
                    neighbors.push(neigh);
                }
            }
        }
        emit(
                { type: "Point", coordinates: [doc.longitude, doc.latitude] }, 
                {
                    id: doc._id,
                    hostname: doc.hostname,
                    latlng: [doc.latitude, doc.longitude],
                    tags: doc.tags,
                    antennas: antennas,
                    neighbors: neighbors
                }
            );
    }
}
