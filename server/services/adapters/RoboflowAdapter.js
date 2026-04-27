const fs = require("fs");
const axios = require("axios");

class RoboflowAdapter {
  constructor(apiKey, workspace) {
    this.apiKey = apiKey;
    this.workspace = workspace;
  }

  async analyze(config, imagePath) {
    const base64Image = fs.readFileSync(imagePath, { encoding: "base64" });

    if (config.type === "workflow") {
      const url = `https://serverless.roboflow.com/${this.workspace}/workflows/${config.id}`;
      const response = await axios({
        method: "POST",
        url,
        headers: { "Content-Type": "application/json" },
        data: {
          api_key: this.apiKey,
          inputs: { image: { type: "base64", value: base64Image } },
        },
      });
      return response.data;
    } else {
      const url = `https://serverless.roboflow.com/${config.id}/${config.version}`;
      const response = await axios({
        method: "POST",
        url,
        params: { api_key: this.apiKey },
        data: base64Image,
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
      });
      return response.data;
    }
  }
}

module.exports = RoboflowAdapter;
