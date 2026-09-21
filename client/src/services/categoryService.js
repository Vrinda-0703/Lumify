import {categoryService} from "./featureService";
export const getCategories=()=>categoryService.list();export const addCategory=(d)=>categoryService.create(d);export const updateCategory=(id,d)=>categoryService.update(id,d);export const deleteCategory=(id)=>categoryService.remove(id);
