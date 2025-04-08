import axios from "axios";
import { jest } from "@jest/globals";

jest.mock("axios");

// by returning the mocked module directly, we can mock responses in tests
// like `axios.get.mockResolvedValue()`; otherwise, we'd be unable to mock
// responses because `createApiClient` would be returning an axios instance
// unaffected by mocks applied to the `axios` module itself.
export function createApiClient(_token?: string) {
  return axios;
}
