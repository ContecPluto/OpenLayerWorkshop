import ol_ext_input_Checkbox from './input_che.js';

/** Switch input
 * @function Object() { [native code] }
 * @extends {ol_ext_input_Checkbox}
 * @fires check
 * @param {*} options
 *  @param {string} [options.className]
 *  @param {Element} [options.input] input element, if non create one
 *  @param {Element} [options.parent] parent element, if create an input
 */
const ol_ext_input_Radio = class olextinputRadio extends ol_ext_input_Checkbox {
  constructor(options) {
    options = options || {};

    super(options);

    this.element.className = (
      'ol-ext-check ol-ext-radio ' + (options.className || '')
    ).trim();
  }
};

export default ol_ext_input_Radio;
