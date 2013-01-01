function mapwidget(divId, getPopupHTML) {
    this.getPopupHTML = getPopupHTML;
    this.map = L.map(divId).fitWorld();
    L.tileLayer('http://{s}.tile.cloudmade.com/{key}/{styleId}/256/{z}/{x}/{y}.png', {
        key: 'e4e152a60cc5414eb81532de3d676261',
        styleId: 997,
        attribution: 'Map data &copy; <a href="http://openstreetmap.org">OpenStreetMap</a> contributors, <a href="http://creativecommons.org/licenses/by-sa/2.0/">CC-BY-SA</a>, Imagery &copy; <a href="http://cloudmade.com">CloudMade</a>'
    }).addTo(this.map);

    this.antennalayer = L.layerGroup().addTo(this.map);
    this.neighborlayer = L.layerGroup().addTo(this.map);
    this.nodelayer = L.layerGroup().addTo(this.map);

    this.map.on('locationfound', this.onLocationFound.bind(this));
    this.map.on('locationerror', this.onLocationError.bind(this));
    this.map.on('moveend', this.onMoveEnd.bind(this));

    /* nodes[id] = { 
        data: data from _spatial/nodes view, i.e.
            {
                id:
                hostname:
                latlng: [51.12, 13.012],
                tags:
                antennas: [...]
                neighbors: [...]
        antenna_markers: L.marker [],
        marker: L.circleMarker (clickable circle),
        neighbors:  
            {
                id1: L.polyline1,
                id2, L.polyline2
            }, 
        neighbors_handled: true|false (have we tried to 
            connect/retrieve all neighbors of this node?)
    } */
    this.nodes = {}; 

    /* neighbors_pending[id] is an object where the keys are node ids
    that already are present in this.nodes and are waiting for its
    neighbor with id 'id'. */
    this.neighbors_pending = {};

    ich.addTemplate('nodemarker', '<svg width="{{w}}" height="{{h}}">\
    <defs>\
        <radialGradient id="gradfill" gradientUnits="userSpaceOnUse" cx="{{hw}}" cy="{{hh}}" r="{{r}}" fx="{{hw}}" fy="{{hh}}">\
            <stop offset="0%" style="stop-color:rgb(0,0,255); stop-opacity:0" />\
            <stop offset="20%" style="stop-color:rgb(0,0,255); stop-opacity:0" />\
            <stop offset="25%" style="stop-color:rgb(0,0,255); stop-opacity:0.75" />\
            <stop offset="30%" style="stop-color:rgb(0,0,255); stop-opacity:0.75" />\
            <stop offset="35%" style="stop-color:rgb(0,0,255); stop-opacity:0" />\
            <stop offset="40%" style="stop-color:rgb(0,0,255); stop-opacity:0" />\
            <stop offset="45%" style="stop-color:rgb(0,0,255); stop-opacity:0.55" />\
            <stop offset="50%" style="stop-color:rgb(0,0,255); stop-opacity:0.55" />\
            <stop offset="55%" style="stop-color:rgb(0,0,255); stop-opacity:0" />\
            <stop offset="60%" style="stop-color:rgb(0,0,255); stop-opacity:0" />\
            <stop offset="65%" style="stop-color:rgb(0,0,255); stop-opacity:0.35" />\
            <stop offset="70%" style="stop-color:rgb(0,0,255); stop-opacity:0.35" />\
            <stop offset="75%" style="stop-color:rgb(0,0,255); stop-opacity:0" />\
            <stop offset="80%" style="stop-color:rgb(0,0,255); stop-opacity:0" />\
            <stop offset="85%" style="stop-color:rgb(0,0,255); stop-opacity:0.15" />\
            <stop offset="90%" style="stop-color:rgb(0,0,255); stop-opacity:0.15" />\
            <stop offset="95%" style="stop-color:rgb(0,0,255); stop-opacity:0" />\
        </radialGradient>\
        <radialGradient id="gradline" gradientUnits="userSpaceOnUse" cx="{{hw}}" cy="{{hh}}" r="{{r}}" fx="{{hw}}" fy="{{hh}}">\
            <stop offset="0%" style="stop-color:rgb(0,0,255); stop-opacity:1" />\
            <stop offset="100%" style="stop-color:rgb(0,0,255);stop-opacity:0" />\
        </radialGradient>\
    </defs>\
    {{{paths}}}\
</svg>');
}

mapwidget.prototype.onLocationFound = function(e) {
    var radius = e.accuracy / 2;
    L.circle(e.latlng, radius).addTo(this.map).bindPopup("You seem to be within " + radius + " meters from this point").openPopup();
}

mapwidget.prototype.onLocationError = function(e) {
    console.log(e.message);
}

mapwidget.prototype.onMoveEnd = function(e) {
    bboxstr = this.map.getBounds().toBBoxString();
    //onBboxChange(bboxstr);
    //getNodesBBOX(bboxstr, this.handleNodeupdate.bind(this));
    $.getJSON('_spatial/nodes', { "bbox": bboxstr }, (function(data) {
            var missing_neighbors = {};
            console.log('nodes received!');
            console.log(data);
            for (var row_idx=0; row_idx<data.rows.length; row_idx++) {
                nodedata = data.rows[row_idx].value;
                this.addNode(nodedata);
                if (!this.nodes[nodedata.id].neighbors_handled) {
                    for (var neigh_idx=0; neigh_idx<nodedata.neighbors.length; neigh_idx++) {
                        neigh = nodedata.neighbors[neigh_idx];
                        // neighbor stored in this.nodes?
                        if (this.nodes[neigh.id]) {
                            this.addNeighbor(nodedata.id, neigh.id);
                            if (missing_neighbors[nodedata.id]) {
                                delete missing_neighbors[nodedata.id]
                            }
                        } else {
                            missing_neighbors[neigh.id] = true;
                            if (!this.neighbors_pending[neigh.id]) {
                                this.neighbors_pending[neigh.id] = {};
                            }
                            this.neighbors_pending[neigh.id][nodedata.id] = true;
                        }
                    }
                    if (this.neighbors_pending[nodedata.id]) {
                        for (neigh in this.neighbors_pending[nodedata.id]) {
                            this.addNeighbor(nodedata.id, neigh);
                        }
                        delete this.neighbors_pending[nodedata.id];
                    }
                    this.nodes[nodedata.id].neighbors_handled = true;
                }
            }
            console.log(this.neighbors_pending);
            missing_neighbors = Object.keys(missing_neighbors);
            if (missing_neighbors.length>0) {
                console.log('missing nodes:');
                console.log(missing_neighbors);
                console.log(JSON.stringify({ "keys": missing_neighbors }))

                // does not work with $.post(). Why? Dunno.
                $.ajax({
                    type: 'POST',
                    dataType: 'json',
                    contentType: "application/json",
                    data: JSON.stringify({"keys": missing_neighbors }),
                    url: '_view/nodes_essentials',
                    success: (function(data){
                        console.log('success!');
                        console.log(data);
                        for (var row_idx=0; row_idx<data.rows.length; row_idx++) {
                            nodedata = data.rows[row_idx].value;
                            this.addNode(nodedata);

                            if (this.neighbors_pending[nodedata.id]) {
                                for (neigh in this.neighbors_pending[nodedata.id]) {
                                    this.addNeighbor(nodedata.id, neigh);
                                }
                                delete this.neighbors_pending[nodedata.id];
                            }
                        }
                    }).bind(this)
                });

            }
        }).bind(this));
}

function getAntennaIconSVG(h, w, antenna) {
    var data = {
        antenna: antenna,
        h: h,
        w: w,
        hh: h/2,
        hw: w/2,
        r: h*0.45,
        paths: ((antenna && antenna.direction && antenna.beamH) ?
                function() {
                    var ant = this.antenna,
        cx = this.hw,
        cy = this.hh,
        r = this.r,
        start = (ant.direction - ant.beamH/2)*2*Math.PI/360,
        aperture = ant.beamH*2*Math.PI/360,
        startxy = [ Math.cos(start)*r, Math.sin(start)*r ],
        endxy = [ Math.cos(start+aperture)*r - startxy[0], Math.sin(start+aperture)*r - startxy[1] ],
        ret = '';
        ret += '<path d="M' + cx + ',' + cy + ' l' + startxy[0] + ' ' + startxy[1] + ' a' + r + ',' + r + ' ' + start + ' ' + ((aperture<Math.PI)? '0' : '1') +',1 ' + endxy[0] + ',' + endxy[1] + ' z' + '" fill="url(#gradfill)" />';
        ret += '<line x1="'+cx+'" y1="'+cy+'" x2="'+(cx+startxy[0])+'" y2="'+(cy+startxy[1])+'" stroke="url(#gradline)" stroke-width="2" />';
        ret += '<line x1="'+cx+'" y1="'+cy+'" x2="'+(cx+endxy[0]+startxy[0])+'" y2="'+(cy+endxy[1]+startxy[1])+'" stroke="url(#gradline)" stroke-width="2" />';
        ret += '<circle cx="'+cx+'" cy="'+cy+'" r="'+0.1*r+'" />';
        return ret;
                }
                :
                function () {
                    var ant = this.antenna,
        cx = this.hw,
        cy = this.hh,
        r = this.r,
        ret = '';
                    ret += '<circle cx="'+cx+'" cy="'+cy+'" r="'+r+'" fill="url(#gradfill)" />';
                    ret += '<circle cx="'+cx+'" cy="'+cy+'" r="'+0.1*r+'" />';
                    return ret;
                })
    }
    svg = ich.nodemarker(data, true);
    return svg;
}

mapwidget.prototype.addAntennaMarkers = function(antennas, latlng) {
    var antenna_markers = [];
    if (!antennas || antennas.length==0) {
        antennas = [{}];
    }
    for (var i=0; i<antennas.length; i++) {
        svg = getAntennaIconSVG(100, 100, antennas[i]);

        antenna_markers.push( L.marker(latlng, 
            { 
                icon: new L.DivIcon(
                {
                    html: svg,
                    iconAnchor: new L.Point(50,50),
                    className: "antenna_marker"
                })
            }).addTo(this.antennalayer)
        );
    }
    return antenna_markers;
}

mapwidget.prototype.addNodeMarker = function(nodedata) {
    return L.circleMarker(nodedata.latlng, 
        {
            fillColor: "#00FF00", 
            fillOpacity: 0.5, 
            weight: 3, 
            color: "#009900", 
            opacity: 0.8
        }).setRadius(15).addTo(this.nodelayer).bindPopup(this.getPopupHTML(nodedata));
}

mapwidget.prototype.addNeighbor = function(id1, id2) {
    var node1 = this.nodes[id1]
    var node2 = this.nodes[id2]

    if (node1.neighbor_lines[id2] && node2.neighbor_lines[id1]) {
        console.log('neighbors '+id1+' and '+id2+' are already registered!')
        return
    }

    var line = L.polyline([node1.data.latlng,node2.data.latlng]).addTo(this.neighborlayer)
    node1.neighbor_lines[id2] = line;
    node2.neighbor_lines[id1] = line;
}

mapwidget.prototype.addNode = function(nodedata) {
    if (this.nodes[nodedata.id]) {
        return
    }
    this.nodes[nodedata.id] = {
        data: nodedata,
        neighbor_lines: {},
        neighbors_handled: false,
        antenna_markers: this.addAntennaMarkers(nodedata.antennas, nodedata.latlng),
        node_marker: this.addNodeMarker(nodedata)
    };
}
