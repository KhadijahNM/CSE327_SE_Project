class UserDecorator {
  constructor(user) {
    this.user = user;
  }

  decorate() {
    if (!this.user) return null;
    
    const fullName = this.user.fullname || "";
    const displayName = this.user.display_name || (fullName ? fullName.split(" ")[0] : "");

    return {
      id: this.user.id,
      name: displayName || fullName || this.user.email,
      fullName,
      displayName,
      email: this.user.email,
      phone: this.user.phone || "",
      dob: this.user.dob ? new Date(this.user.dob).toISOString().slice(0, 10) : "",
      gender: this.user.gender || "",
      role: this.user.role || "user",
      status: this.user.status || "active"
    };
  }
}

module.exports = UserDecorator;
