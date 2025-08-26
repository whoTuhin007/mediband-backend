import mongoose from 'mongoose';
import passportLocalMongoose from 'passport-local-mongoose';

const userSchema = new mongoose.Schema(
  {
    fullname: {
      type: String,
      required: true
    },
    email: {
      type: String,
      required: true,
      unique: true
    }
  
  },
  { timestamps: true }
);

// plugin injects username, hash, salt, authenticate(), register(), etc.
userSchema.plugin(passportLocalMongoose, { usernameField: 'email' });

const User = mongoose.models.User || mongoose.model('User', userSchema);
export default User;    
