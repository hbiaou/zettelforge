import { Plugin } from "obsidian";

export default class ZettelForgePlugin extends Plugin {
    async onload() {
        console.log("Loading ZettelForge plugin");
    }

    async onunload() {
        console.log("Unloading ZettelForge plugin");
    }
}
