import { Crm }  from "@run-morph/models";
import { Create, ResourceEvent, Metadata, Error }  from "@run-morph/sdk";

const metadata:Metadata<Crm.Contact> = {
    model: Crm.Contact,
	scopes:[
        'crm.objects.contacts.write',
        'crm.schemas.contacts.write'
    ]
};

export default new Create( async (runtime, { data }) => { 
	
    const response = await runtime.proxy({
        method: 'POST',
        path: '/sobjects/Contact', // Adjust API version as needed
        body:{
            FirstName: data.first_name,
            LastName: data.last_name,
            Email: data.email,
            Phone: data.phone
        }
    });

    console.log(response)
    
    if(response.status === 'error'){
        switch (response.category){
            case 'CONFLICT':
                throw new Error(Error.Type.RESOURCE_ALREADY_EXIST, response.message);
            default:
                throw new Error(Error.Type.UNKNOWN_ERROR, response.message);
        }
    }
    
    if(response.id){
        const resource = new ResourceEvent({ 
            id: response.id,
            created_at: new Date(response.createdAt).toISOString(),
            updated_at: new Date(response.updatedAt).toISOString()
        }, Crm.Contact)  
       
        return resource;
    } else {
        throw new Error(Error.Type.UNKNOWN_ERROR);
    }

}, metadata);