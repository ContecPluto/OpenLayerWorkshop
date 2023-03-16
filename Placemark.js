/*	Copyright (c) 2018 Jean-Marc VIGLINO, 
  released under the CeCILL-B license (French BSD license)
  (http://www.cecill.info/licences/Licence_CeCILL-B_V1-en.txt).
*/

import ol_Overlay_Popup from './Popup.js';

/**
 * @classdesc
 * A placemark element to be displayed over the map and attached to a single map
 * location. The placemarks are customized using CSS.
 *
 * @example
 var popup = new ol_Overlay_Placemark();
 map.addOverlay(popup);
 popup.show(coordinate);
 popup.hide();
 *
 * @function Object() { [native code] }
 * @extends {ol_Overlay}
 * @param {} options Extend ol/Overlay/Popup options
 *	@param {string} options.color placemark color
 *	@param {string} options.backgroundColor placemark color
 *	@param {string} options.contentColor placemark color
 *	@param {number} options.radius placemark radius in pixel
 *	@param {string} options.popupClass the a class of the overlay to style the popup.
 *	@param {Function | undefined} options.onclose: callback function when popup is closed
 *	@param {Function | undefined} options.onshow callback function when popup is shown
 * @api stable
 */
const ol_Overlay_Placemark = class olOverlayPlacemark extends ol_Overlay_Popup {
  constructor(options) {
    options = options || {};
    options.popupClass = (options.popupClass || '') + ' placemark anim';
    (options.positioning = 'bottom-center'), super(options);
    this.setPositioning = function () {};

    if (options.color) {
      this.element.style.color = options.color;
    }
    if (options.backgroundColor) {
      this.element.style.backgroundColor = options.backgroundColor;
    }
    if (options.contentColor) {
      this.setContentColor(options.contentColor);
    }
    if (options.size) {
      this.setRadius(options.size);
    }
  }
  /**
   * Set the position and the content of the placemark (hide it before to enable animation).
   * @param {ol.Coordinate|string} coordinate the coordinate of the popup or the HTML content.
   * @param {string|undefined} html the HTML content (undefined = previous content).
   */
  show(coordinate, html) {
    if (coordinate === true) {
      coordinate = this.getPosition();
    }
    this.hide();
    super.show(coordinate, html);
  }
  /**
   * Set the placemark color.
   * @param {string} color
   */
  setColor(color) {
    this.element.style.color = color;
  }
  /**
   * Set the placemark background color.
   * @param {string} color
   */
  setBackgroundColor(color) {
    this._elt.style.backgroundColor = color;
  }
  /**
   * Set the placemark content color.
   * @param {string} color
   */
  setContentColor(color) {
    const c = this.element.getElementsByClassName('ol-popup-content')[0];
    if (c) {
      c.style.color = color;
    }
  }
  /**
   * Set the placemark class.
   * @param {string} name
   */
  setClassName(name) {
    const oldclass = this.element.className;
    this.element.className =
      'ol-popup placemark ol-popup-bottom ol-popup-center ' +
      (/visible/.test(oldclass) ? 'visible ' : '') +
      (/anim/.test(oldclass) ? 'anim ' : '') +
      name;
  }
  /**
   * Set the placemark radius.
   * @param {number} size size in pixel
   */
  setRadius(size) {
    this.element.style.fontSize = size + 'px';
  }
};

export default ol_Overlay_Placemark;
