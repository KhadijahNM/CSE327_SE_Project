class ResponseBuilder {
  constructor() {
    this.response = { ok: true };
  }

  setSuccess(isSuccess) {
    this.response.ok = isSuccess;
    return this;
  }

  setData(data) {
    if (data && typeof data === 'object' && !Array.isArray(data)) {
      this.response = { ...this.response, ...data };
    } else {
      this.response.data = data;
    }
    return this;
  }

  setError(errorMsg) {
    this.response.ok = false;
    this.response.error = errorMsg;
    return this;
  }

  setMessage(msg) {
    this.response.message = msg;
    return this;
  }

  setFallback(fallbackData, detailMsg, warningMsg) {
    this.response = { ...this.response, ...fallbackData, detail: detailMsg, warning: warningMsg };
    return this;
  }

  setDeletedCount(count) {
    this.response.deleted = count;
    return this;
  }

  build() {
    return this.response;
  }
}

module.exports = ResponseBuilder;
