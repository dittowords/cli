import { htmlMarkupExtractor } from "./html-markup";

const extract = (source: string) => htmlMarkupExtractor.extract({ source, kind: "html" });

describe("htmlMarkupExtractor", () => {
  test("emits element text as markup_text tagged with its parent tag", async () => {
    const hits = await extract(`<p>Welcome home</p>\n`);
    const text = hits.find((h) => h.value.trim() === "Welcome home");
    expect(text?.context.parentRole).toBe("markup_text");
    expect(text?.context.parentTag).toBe("p");
  });

  test("emits plain attribute values as markup_attr with attribute name", async () => {
    const hits = await extract(`<input placeholder="Email" type="text" />\n`);
    const email = hits.find((h) => h.value === "Email");
    expect(email?.context.parentRole).toBe("markup_attr");
    expect(email?.context.identifiers).toEqual(["placeholder"]);
  });

  test("skips contents of <script> and <style>", async () => {
    const hits = await extract(
      `<style>body { color: "red"; }</style>\n<script>const msg = "Hi";</script>\n<p>Real copy</p>\n`
    );
    const values = hits.map((h) => h.value.trim());
    expect(values).toContain("Real copy");
    expect(values).not.toContain("Hi");
  });

  test("skips framework directive attributes (`@click`, `:foo`, `v-on`)", async () => {
    const hits = await extract(`<button @click="onClick" :class="cls" v-bind:id="id">Go</button>\n`);
    const attrNames = hits.filter((h) => h.context.parentRole === "markup_attr").flatMap((h) => h.context.identifiers);
    expect(attrNames).not.toContain("@click");
    expect(attrNames).not.toContain(":class");
    expect(attrNames).not.toContain("v-bind:id");
    expect(hits.some((h) => h.value.trim() === "Go")).toBe(true);
  });

  test("suppresses parentTag for descendants of <code>/<pre>", async () => {
    const hits = await extract(`<pre><span>foo bar</span></pre>\n`);
    const inner = hits.find((h) => h.value.trim() === "foo bar");
    expect(inner?.context.parentRole).toBe("markup_text");
    expect(inner?.context.parentTag).toBeUndefined();
  });

  test("extracts inner literals from template interpolation expressions", async () => {
    const hits = await extract(`<p>{{ isFollowing ? 'Unfollow' : 'Follow' }}</p>\n`);
    const values = hits.filter((h) => h.context.parentRole === "markup_text").map((h) => h.value);
    expect(values).toEqual(expect.arrayContaining(["Unfollow", "Follow"]));
  });
});
