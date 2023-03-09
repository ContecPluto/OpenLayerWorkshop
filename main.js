/* global pmtiles */
import DataTile from 'ol/source/DataTile.js';
import Draw from 'ol/interaction/Draw';
import LineString from 'ol/geom/LineString';
import Map from 'ol/Map.js';
import Modify from 'ol/interaction/Modify';
import Snap from 'ol/interaction/Snap';
import TileLayer from 'ol/layer/WebGLTile.js';
import VectorLayer from 'ol/layer/Vector';
import VectorSource from 'ol/source/Vector';
import View from 'ol/View.js';
import {OSM} from 'ol/source.js';
import {Overlay} from 'ol';
import {get, useGeographic} from 'ol/proj';

useGeographic();

function getDistance(ax, ay, zx, zy) {
  const dx = ax - zx;
  const dy = ay - zy;
  return Math.round(Math.sqrt(Math.abs(dx * dx) + Math.abs(dy * dy)), 3);
}

const tiles = new pmtiles.PMTiles(
  'https://pub-9288c68512ed46eca46ddcade307709b.r2.dev/protomaps-sample-datasets/terrarium_z9.pmtiles'
);

function loadImage(src) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.addEventListener('load', () => resolve(img));
    img.addEventListener('error', () => reject(new Error('load failed')));
    img.src = src;
  });
}

async function loader(z, x, y) {
  const response = await tiles.getZxy(z, x, y);
  const blob = new Blob([response.data]);
  const src = URL.createObjectURL(blob);
  const image = await loadImage(src);
  // const a = document.createElement('a');
  // a.href = src;
  // a.download = `example${x}${y}${z}.png`;
  // a.click();
  // a.remove();

  URL.revokeObjectURL(src);
  return image;
}

// The method used to extract elevations from the DEM.
// DEM에서 표고를 추출하는 데 사용되는 방법입니다.
function elevation(xOffset, yOffset) {
  const red = ['band', 1, xOffset, yOffset];
  const green = ['band', 2, xOffset, yOffset];
  const blue = ['band', 3, xOffset, yOffset];

  return ['-', ['+', ['*', 256 * 256, red], ['*', 256, green], blue], 32868];
  // Todo 계산시 확립 필요
  // return ['-', ['+', ['*', 256 * 256, red], ['*', 256, green], blue], 32768];
}

const variables = {};

const layer = new TileLayer({
  source: new DataTile({
    loader,
    wrapX: true,
    maxZoom: 13,
  }),
  style: {
    variables: variables,
    color: [
      'case',
      ['<', elevation(0, 0), 100],
      [0, 0, 0, 0],
      ['<', elevation(0, 0), 200],
      [255, 0, 0, 0.5],
      ['<', elevation(0, 0), 300],
      [0, 255, 0, 0.5],
      [0, 0, 0, 0],
    ],
  },
});

const controlIds = ['vert', 'sunEl', 'sunAz'];
controlIds.forEach(function (id) {
  const control = document.getElementById(id);
  const output = document.getElementById(id + 'Out');
  function updateValues() {
    output.innerText = control.value;
    variables[id] = Number(control.value);
  }
  updateValues();
  control.addEventListener('input', function () {
    updateValues();
    layer.updateStyleVariables(variables);
  });
});

// start draw

const source = new VectorSource();
const vector = new VectorLayer({
  source: source,
  style: {
    'fill-color': 'rgba(255, 255, 255, 0.2)',
    'stroke-color': '#ffcc33',
    'stroke-width': 2,
    'circle-radius': 7,
    'circle-fill-color': '#ffcc33',
  },
});

// Limit multi-world panning to one world east and west of the real world.
// Geometry coordinates have to be within that range.
const extent = get('EPSG:3857').getExtent().slice();
extent[0] += extent[0];
extent[2] += extent[2];

// end draw
const map = new Map({
  target: 'map',
  layers: [
    new TileLayer({
      source: new OSM(),
    }),
    vector,
    layer,
  ],
  view: new View({
    center: [0, 0],
    zoom: 1,
  }),
});

// 입면도 가져오기
function getElevation(data) {
  const red = data[0];
  const green = data[1];
  const blue = data[2];
  return red * 256 + green + blue / 256 - 32768;
}

// 위도 경도 계산 함수
function formatLocation([lon, lat]) {
  const NS = lat < 0 ? 'S' : 'N';
  const EW = lon < 0 ? 'W' : 'E';
  return `${Math.abs(lat).toFixed(1)}° ${NS}, ${Math.abs(lon).toFixed(
    1
  )}° ${EW}`;
}

const elevationOut = document.getElementById('elevationOut');
const locationOut = document.getElementById('locationOut');
function displayPixelValue(event) {
  const data = layer.getData(event.pixel);
  if (!data) {
    return;
  }
  elevationOut.innerText = getElevation(data).toLocaleString() + ' m';
  locationOut.innerText = formatLocation(event.coordinate);
}

map.on(['pointermove', 'click'], displayPixelValue);

const modify = new Modify({source: source});
map.addInteraction(modify);

let draw, snap; // global so we can remove them later
const typeSelect = document.getElementById('type');

function addInteractions() {
  draw = new Draw({
    source: source,
    type: typeSelect.value,
  });
  map.addInteraction(draw);
  snap = new Snap({source: source});
  map.addInteraction(snap);

  draw.on('drawend', (event) => {
    const feature = event.feature;

    if (feature.getGeometry().getType() === 'Point') {
      const coordinate = feature.getGeometry().getCoordinates();
      const featurePixel = map.getPixelFromCoordinate(coordinate);

      console.log(getElevation(layer.getData(featurePixel)));
    } else if (feature.getGeometry().getType() === 'LineString') {
      const geometry = feature.getGeometry();
      const coordinates = geometry.getCoordinates();

      const plotData = {
        x: [],
        y: [],
        mode: 'lines+markers',
        connectgaps: true,
      };

      let xmin = 0;
      let ymin = 0;

      const x1 = geometry.getFirstCoordinate()[0];
      const y1 = geometry.getFirstCoordinate()[1];

      coordinates.forEach((cor) => {
        const xmax = Math.floor(cor[0]);
        const ymax = Math.floor(cor[1]);

        for (let x = xmin; x <= xmax; x += 2) {
          for (let y = ymin; y <= ymax; y += 2) {
            const featurePixel = map.getPixelFromCoordinate([x, y]);
            plotData.y.push(getElevation(layer.getData(featurePixel)));
          }
        }

        xmin = Math.ceil(cor[0]);
        ymin = Math.ceil(cor[1]);
      });

      const layout = {
        title: 'Connect the Gaps Between Data',
        showlegend: false
      };

      Plotly.newPlot('tester', [plotData], layout);
    } else {
      const geometry = feature.getGeometry();
      const coordinates = geometry.getCoordinates()[0];

      const xcor = coordinates.map((e) => e[0]);
      const ycor = coordinates.map((e) => e[1]);

      const xmin = Math.ceil(Math.min(...xcor));
      const xmax = Math.floor(Math.max(...xcor));

      const ymin = Math.ceil(Math.min(...ycor));
      const ymax = Math.floor(Math.max(...ycor));

      const plotData = {
        z: [],
      };

      let test;
      for (let x = xmin; x <= xmax; x++) {
        test = [];
        for (let y = ymin; y <= ymax; y++) {
          const isInsidePolygon = geometry.intersectsCoordinate([x, y]);

          if (isInsidePolygon) {
            const featurePixel = map.getPixelFromCoordinate([x, y]);
            test.push(getElevation(layer.getData(featurePixel)));
          } else {
            test.push(0);
          }
        }

        plotData.z.push(test);
      }
      DrawChart(plotData);
    }
  });
}

window.ls = LineString;

/**
 * Handle change event.
 */
typeSelect.onchange = function () {
  map.removeInteraction(draw);
  map.removeInteraction(snap);
  addInteractions();
};

addInteractions();

const element = document.getElementById('info');

const popup = new Overlay({
  element: element,
  positioning: 'bottom-center',
  stopEvent: false,
});
map.addOverlay(popup);

let popover;
function disposePopover() {
  if (popover) {
    popover.dispose();
    popover = undefined;
  }
}

// display popup on click
map.on('click', function (evt) {
  const feature = map.forEachFeatureAtPixel(evt.pixel, function (feature) {
    return feature;
  });
  disposePopover();
  if (!feature) {
    return;
  }

  popup.setPosition(evt.coordinate);
  popover = new bootstrap.Popover(element, {
    placement: 'top',
    html: true,
    content: '테스트',
  });
  popover.show();
});

// change mouse cursor when over marker

// Close the popup when the map is moved
map.on('movestart', disposePopover);

import './plotly.min.js';

const layout = {
  scene: {camera: {eye: {x: 1.87, y: 0.88, z: -0.64}}},
  autosize: false,
  height: 500,
  margin: {
    l: 65,
    r: 50,
    b: 65,
    t: 90,
  },
};

function DrawChart(plot) {
  const data = [
    {
      ...plot,
      type: 'surface',
      contours: {
        z: {
          show: true,
          usecolormap: true,
          highlightcolor: '#42f462',
          project: {z: true},
        },
      },
    },
  ];

  Plotly.newPlot('tester', data, layout);
}
