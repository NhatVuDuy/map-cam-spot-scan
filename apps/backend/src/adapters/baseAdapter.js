/**
 * BaseAdapter — interface contract for all data source adapters.
 */
export class BaseAdapter {
  /**
   * Fetch points of interest within a bounding box for given categories.
   * @param {number[]} bbox - [south, west, north, east]
   * @param {string[]} categories
   * @param {object} config
   * @returns {Promise<object[]>}
   */
  // eslint-disable-next-line no-unused-vars
  async fetchPOI(bbox, categories, config) {
    throw new Error("fetchPOI() not implemented");
  }

  /**
   * Fetch road ways within a bounding box.
   * @param {number[]} bbox - [south, west, north, east]
   * @param {object} config
   * @returns {Promise<object[]>}
   */
  // eslint-disable-next-line no-unused-vars
  async fetchRoads(bbox, config) {
    throw new Error("fetchRoads() not implemented");
  }
}
