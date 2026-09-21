const mongoose=require("mongoose");
const schema=new mongoose.Schema({user:{type:mongoose.Schema.Types.ObjectId,ref:"User",required:true,index:true},name:{type:String,required:true,trim:true,maxlength:80},type:{type:String,enum:["Cash","Bank","UPI","Wallet","Credit Card","Other"],default:"Bank"},openingBalance:{type:Number,default:0},color:{type:String,default:"violet"},notes:{type:String,default:"",maxlength:500}},{timestamps:true});
schema.index({user:1,name:1},{unique:true});
module.exports=mongoose.model("Account",schema);
