import * as Client from "../../http/client";
import verifyOAuthAccess from "./verifyAccess";

describe("verifyOAuthAccess", () => {
  const respondWith = (response: unknown) => {
    const get = jest.fn().mockResolvedValue(response);
    jest.spyOn(Client, "default").mockReturnValue({ get } as any);
    return get;
  };

  it("passes a working token", async () => {
    respondWith({ status: 200, data: { name: "Workspace" } });

    expect(await verifyOAuthAccess("Bearer at")).toBeNull();
  });

  // /token-check explains some refusals in the body better than we could.
  it("surfaces the API's own explanation when it sends one", async () => {
    respondWith({
      status: 401,
      data: "Developer Integrations are not enabled for this workspace.",
    });

    expect(await verifyOAuthAccess("Bearer at")).toEqual([
      expect.stringContaining("Developer Integrations"),
    ]);
  });

  it("reports an unexplained 401 as a rejected token", async () => {
    respondWith({ status: 401, data: "" });

    const output = (await verifyOAuthAccess("Bearer at"))?.join(" ");
    expect(output).toMatch(/didn't accept/i);
    expect(output).toContain("401");
  });

  it("tells the user to sign in to the web app on a 403", async () => {
    respondWith({ status: 403, data: "" });

    expect((await verifyOAuthAccess("Bearer at"))?.join(" ")).toMatch(
      /sign in to ditto in your browser/i
    );
  });

  it("reports the status for anything else", async () => {
    respondWith({ status: 500, data: "" });

    expect((await verifyOAuthAccess("Bearer at"))?.join(" ")).toContain("500");
  });

  it("reports a network failure rather than blaming the token", async () => {
    const get = jest.fn().mockRejectedValue(new Error("ECONNREFUSED"));
    jest.spyOn(Client, "default").mockReturnValue({ get } as any);

    expect((await verifyOAuthAccess("Bearer at"))?.join(" ")).toMatch(
      /couldn't reach/i
    );
  });
});
