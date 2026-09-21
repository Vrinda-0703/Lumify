import api from "./api";
export const getProfile=async()=>(await api.get("/profile")).data;
export const updateProfile=async(data)=>(await api.put("/profile",data)).data;
export const changePassword=async(data)=>(await api.put("/profile/password",data)).data;
