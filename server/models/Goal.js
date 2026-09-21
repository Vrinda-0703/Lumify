const mongoose=require("mongoose");
const schema=new mongoose.Schema({user:{type:mongoose.Schema.Types.ObjectId,ref:"User",required:true},name:{type:String,required:true,trim:true},targetAmount:{type:Number,required:true,min:1},savedAmount:{type:Number,default:0,min:0},targetDate:{type:Date},description:{type:String,default:""}},{timestamps:true});
module.exports=mongoose.model("Goal",schema);