/* global pmtiles */
import DataTile from 'ol/source/DataTile.js';
import Map from 'ol/Map.js';
import TileLayer from 'ol/layer/WebGLTile.js';
import View from 'ol/View.js';
import {DragPan, defaults} from 'ol/interaction';
import {OSM} from 'ol/source.js';
import {fromLonLat, transformExtent, useGeographic} from 'ol/proj';
import {noModifierKeys, singleClick} from 'ol/events/condition';

function transform(extent) {
  return transformExtent(extent, 'EPSG:4326', 'EPSG:3857');
}

useGeographic();

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

// Generates a shaded relief image given elevation data.  Uses a 3x3
// neighborhood for determining slope and aspect.
// 지정된 표고 데이터에서 음영 처리된 릴리프 이미지를 생성합니다. 3x3 사용
// 경사 및 측면을 결정하기 위한 이웃.

// resolution: 해결
const dp = ['*', 2, ['resolution']];
const z0x = ['*', ['var', 'vert'], elevation(-1, 0)];
const z1x = ['*', ['var', 'vert'], elevation(1, 0)];
const dzdx = ['/', ['-', z1x, z0x], dp];
const z0y = ['*', ['var', 'vert'], elevation(0, -1)];
const z1y = ['*', ['var', 'vert'], elevation(0, 1)];
const dzdy = ['/', ['-', z1y, z0y], dp];
// 기울기
const slope = ['atan', ['^', ['+', ['^', dzdx, 2], ['^', dzdy, 2]], 0.5]];
// 측면
const aspect = ['clamp', ['atan', ['-', 0, dzdx], dzdy], -Math.PI, Math.PI];
// 태양의 고도
const sunEl = ['*', Math.PI / 180, ['var', 'sunEl']];
// 태양 방위각
const sunAz = ['*', Math.PI / 180, ['var', 'sunAz']];

const incidence = [
  '+',
  ['*', ['sin', sunEl], ['cos', slope]],
  ['*', ['*', ['cos', sunEl], ['sin', slope]], ['cos', ['-', sunAz, aspect]]],
];

const variables = {
  level: 1000,
};

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

const map = new Map({
  target: 'map',
  layers: [
    new TileLayer({
      source: new OSM(),
    }),
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
