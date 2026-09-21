const mongoose=require("mongoose");
const schema=new mongoose.Schema({user:{type:mongoose.Schema.Types.ObjectId,ref:"User",required:true,index:true},name:{type:String,required:true,trim:true,maxlength:120},amount:{type:Number,required:true,min:0.01},billingCycle:{type:String,enum:["Weekly","Monthly","Quarterly","Yearly"],default:"Monthly"},nextBillingDate:{type:Date,required:true,index:true},active:{type:Boolean,default:true}},{timestamps:true});
schema.index({user:1,active:1,nextBillingDate:1}); module.exports=mongoose.model("Subscription",schema);
