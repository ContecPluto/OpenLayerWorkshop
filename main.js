// Calculate the speed factor
// eslint-disable-next-line import/extensions
import Dijskra from './Dijskra';
import GeoJSON from 'ol/format/GeoJSON';
import {Circle, Fill, Stroke, Style} from 'ol/style';
import {Map, View} from 'ol';
import {Vector as VectorSource, XYZ} from 'ol/source';
import {Tile as TileLayer, Vector as VectorLayer} from 'ol/layer';
import {unByKey} from 'ol/Observable';
import ol_Overlay_Placemark from './Placemark.js';
import {getLength} from 'ol/sphere';

import {
  Select,
  defaults as defaultInteractions,
} from 'ol/interaction.js';

// 테스트 코드
const overlayStyle = (function () {
  const styles = {};
  styles['Polygon'] = [
    new Style({
      fill: new Fill({
        color: [255, 255, 255, 0.5],
      }),
    }),
    new Style({
      stroke: new Stroke({
        color: [255, 255, 255, 1],
        width: 5,
      }),
    }),
    new Style({
      stroke: new Stroke({
        color: [0, 255, 0, 1],
        width: 3,
      }),
    }),
  ];
  styles['MultiPolygon'] = styles['Polygon'];

  styles['LineString'] = [
    new Style({
      stroke: new Stroke({
        color: [255, 255, 255, 1],
        width: 5,
      }),
    }),
    new Style({
      stroke: new Stroke({
        color: [0, 255, 0, 1],
        width: 3,
      }),
    }),
  ];
  styles['MultiLineString'] = styles['LineString'];

  styles['Point'] = [
    new Style({
      image: new Circle({
        radius: 7,
        fill: new Fill({
          color: [0, 255, 0, 1],
        }),
        stroke: new Stroke({
          color: [255, 255, 255, 0.75],
          width: 1.5,
        }),
      }),
      zIndex: 100000,
    }),
  ];
  styles['MultiPoint'] = styles['Point'];

  styles['GeometryCollection'] = styles['Polygon'].concat(styles['Point']);

  return function (feature) {
    return styles[feature.getGeometry().getType()];
  };
})();

const select = new Select({
  style: overlayStyle,
})
// end 테스트 코드

let speed = {A: 1, P: 1, R: 1, L: 1};
function calcSpeed() {
  if ($('#speed').prop('checked')) {
    speed.A = 1 / Math.max(Number($('.speed #A').val()), 1);
    speed.P = 1 / Math.max(Number($('.speed #P').val()), 1);
    speed.R = 1 / Math.max(Number($('.speed #R').val()), 1);
    speed.L = 1 / Math.max(Number($('.speed #L').val()), 1);
  } else {
    speed = {A: 1, P: 1, R: 1, L: 1};
  }
}
calcSpeed();

// Layers
const layers = [
  new TileLayer({
    source: new XYZ({
      url: 'http://mt0.google.com/vt/lyrs=y&x={x}&y={y}&z={z}&hl=kr',
      crossOrigin: 'anonymous',
    }),
  }),
];

// http://mt0.google.com/vt/lyrs=y&x=219&y=100&z=8
// http://mt0.google.com/vt/lyrs=y&x=219&y=100&z=9
// http://mt0.google.com/vt/lyrs=y&x=329&y=22&z=6&hl=kr

// The map
const map = new Map({
  interactions: defaultInteractions().extend([select]),
  target: 'map',
  view: new View({
    zoom: 6,
    center: [166326, 5992663],
  }),
  layers: layers,
});

// The vector graph
const graph = new VectorSource({
  url: './data/route.geojson',
  format: new GeoJSON(),
});
const listenerKey = graph.on('change', function () {
  if (graph.getState() == 'ready') {
    $('.loading').hide();
    unByKey(listenerKey);
  }
});
const vector = new VectorLayer({
  title: 'Graph',
  source: graph,
});
map.addLayer(vector);

// A layer to draw the result
const result = new VectorSource();
map.addLayer(
  new VectorLayer({
    source: result,
    style: new Style({
      stroke: new Stroke({
        width: 2,
        color: '#f00',
      }),
    }),
  })
);

// Dijkstra
const dijkstra = new Dijskra({
  source: graph,
});
// Start processing
dijkstra.on('start', function (e) {
  $('#warning').hide();
  $('#notfound').hide();
  $('#notfound0').hide();
  $('#result').hide();
  result.clear();
});
// Finish > show the route
dijkstra.on('finish', function (e) {
  $('#warning').hide();
  result.clear();

  if (!e.route.length) {
    if (e.wDistance === -1) {
      $('#notfound0').show();
    } else {
      $('#notfound').show();
    }
    $('#result').hide();
  } else {
    $('#result').show();
    let t = (e.distance / 1000).toFixed(2) + 'km';
    // Weighted distance
    if ($('#speed').prop('checked')) {
      const h = e.wDistance / 1000;
      let mn = Math.round(((e.wDistance % 1000) / 1000) * 60);
      if (mn < 10) {
        mn = '0' + mn;
      }
      t += '<br/>' + h.toFixed(0) + 'h ' + mn + 'mn';
    }
    $('#result span').html(t);
  }
  result.addFeatures(e.route);
  start = end;
  popStart.show(start);
  popEnd.hide();
});
// Paused > resume
dijkstra.on('pause', function (e) {
  if (e.overflow) {
    $('#warning').show();
    dijkstra.resume();
  } else {
    // User pause
  }
});
// Calculating > show the current "best way"
dijkstra.on('calculating', function (e) {
  if ($('#path').prop('checked')) {
    const route = dijkstra.getBestWay();
    result.clear();
    result.addFeatures(route);
  }
});

// Get the weight of an edge
dijkstra.weight = function (feature) {
  const type = feature ? feature.get('type') : 'A';
  if (feature && feature.get('weight')) {
    return feature.get('weight')
  }
  if (!speed[type]) {
    console.error(type);
  }
  return speed[type] || speed.L;
};
// Get direction of the edge
dijkstra.direction = function (feature) {
  return feature.get('dir');
};
// Get the real length of the geom
dijkstra.getLength = function (geom) {
  if (geom.getGeometry) {
    //? return geom.get('km')*1000;
    geom = geom.getGeometry();
  }
  return getLength(geom);
};

// Display nodes in a layer
const nodes = new VectorLayer({
  title: 'Nodes',
  source: dijkstra.getNodeSource(),
  style: new Style({
    image: new Circle({
      radius: 5,
      fill: new Fill({color: [255, 0, 0, 0.1]}),
    }),
  }),
});
map.addLayer(nodes);




// Start / end Placemark
const popStart = new ol_Overlay_Placemark({popupClass: 'flagv', color: '#080'});
map.addOverlay(popStart);
const popEnd = new ol_Overlay_Placemark({
  popupClass: 'flag finish',
  color: '#000',
});
map.addOverlay(popEnd);




// Manage start / end on click
let start, end;
map.on('click', function (e) {

});

function mapstart (coor) {
  if (!start) {
    start = coor
    // start = e.coordinate;
    popStart.show(coor);
  } else {
    // popEnd.show(e.coordinate);
    popEnd.show(coor);
    setTimeout(function () {
      const se = dijkstra.path(start, coor);
      if (se) {
        start = se[0];
        end = se[1];
      } else {
        popEnd.hide();
      }
    }, 100);
  }
}

mapstart([-183579.2892892051, 5390479.626496713]);
mapstart([610006.9948723416, 5583440.724252656]);

// 가중치 부여
$('#addWeight').on('click', function () {
  const wLine = select.getFeatures().array_[0];
  wLine.set('weight', 10000)
  dijkstra.path([-183579.2892892051, 5390479.626496713], [610006.9948723416, 5583440.724252656])
})