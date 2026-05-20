import mongoose from "mongoose";
import bcrypt from "bcryptjs";

const userSchema = new mongoose.Schema(
    {
        name: { type: String, required: true, trim: true },
        email: {
            type: String, 
            required: true, 
            unique: true, 
            lowercase: true,
            trim: true,
        },
        password: { type: String, required: true, minlength: 6 },
        avatar: { type: String, default: "" },
        morningMotivation: { type: Boolean, default: false },
    },
    {timestamps: true}
);

// Pre-save hook that runs before any user document is saved
userSchema.pre("save", async function (next) {
    // So that we don't rehash the password if it's not
    if (!this.isModified("password")) return next();
    // If it's a changed or new password
    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt);
    next();
});

userSchema.methods.matchPassword = function (plain) { 
    return bcrypt.compare(plain, this.password);
};

// To make sure password hash is never sent to the client
userSchema.methods.toJSON = function () {
    const obj = this.toObject();
    delete obj.password;
    return obj;
};

export default mongoose.model("User", userSchema);
