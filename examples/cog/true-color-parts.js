import GeoTIFF from 'ol/source/GeoTIFF.js';
import Map from 'ol/Map.js';
import Projection from 'ol/proj/Projection.js';
import TileLayer from 'ol/layer/WebGLTile.js';
import View from 'ol/View.js';
import {getCenter} from 'ol/extent.js';

//! [projection]
const projection = new Projection({
  code: 'EPSG:32721',
  units: 'm',
});
//! [projection]
* OpenLayers에서 WMS레이어로 중첩

var korea_DEM = new ol.layer.Image({
  id: "korea_DEM",
  name: "korea_DEM",
  layerName: "korea_DEM",
  source: new ol.source.ImageWMS({
    ratio: 1,
    url: FGIS_WMSURL,
    params: {
      'FORMAT': 'image/png',
      'VERSION': '1.1.1',
      'TRANSPARENT': 'TRUE',
      'STYLES': '',
      LAYERS: 'korea_dem',
    }
  }),
  opacity: 0.7,
  visible: false
});
[출처] [OpenLayers] 표고/경사/향/음영 데이터 시각화 (GIS Application) | 작성자 공공칠빵
//! [extent]
// metadata from https://s3.us-west-2.amazonaws.com/sentinel-cogs/sentinel-s2-l2a-cogs/21/H/UB/2021/9/S2B_21HUB_20210915_0_L2A/S2B_21HUB_20210915_0_L2A.json
const extent = [300000, 6090260, 409760, 6200020];
//! [extent]

const source = new GeoTIFF({
  sources: [
    {
      url: 'https://sentinel-cogs.s3.us-west-2.amazonaws.com/sentinel-s2-l2a-cogs/21/H/UB/2021/9/S2B_21HUB_20210915_0_L2A/TCI.tif',
    },
  ],
});

const layer = new TileLayer({
  source: source,
});

//! [map]
new Map({
  target: 'map-container',
  layers: [layer],
  view: new View({
    projection: projection,
    center: getCenter(extent),
    extent: extent,
    zoom: 1,
  }),
});
//! [map]
