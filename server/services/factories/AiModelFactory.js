class AiModelFactory {
  static get MODELS() {
    return {
      glaucoma: { type: "model", id: "glaucoma-sdryt", version: "1" },
      dr: { type: "model", id: "diabetic-retinopathy-gmqiq", version: "2" },
      cataract: { type: "model", id: "cataract-detection-viwsu", version: "2" },
      dryeye: { type: "model", id: "eye-ua1gm", version: "3" },
    };
  }

  static getModelConfig(disease) {
    const config = AiModelFactory.MODELS[disease];
    if (!config) {
      throw new Error(`Unknown disease: "${disease}". Choose from: ${Object.keys(AiModelFactory.MODELS).join(", ")}`);
    }
    return config;
  }
}

module.exports = AiModelFactory;
