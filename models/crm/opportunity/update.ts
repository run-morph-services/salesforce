import { Crm }  from '@run-morph/models';
import { Update, ResourceEvent, Metadata, Error }  from '@run-morph/sdk';
import Retrieve from './retrieve';
// Define metadata for the HubSpot deal model
const metadata:Metadata<Crm.Opportunity> = {
	model: Crm.Opportunity,
	scopes: []
};


export default new Update(async (runtime, { id, data }) => {
    let fields: { [key: string]: string | number | boolean } = {};

    // Map unified opportunity data to Salesforce API format
    if (data.name) fields.Name = data.name;
    if (data.description) fields.Description = data.description;
    if (data.amount) fields.Amount = data.amount;
    if (data.currency) fields.CurrencyIsoCode = data.currency;
    if (data.win_probability) fields.Probability = data.win_probability;   
    if (data.closed_at) fields.CloseDate = data.closed_at;
    if (data.owner && data.owner.id) fields.OwnerId = data.owner.id;
    console.log(data.stage.id)
    if (data.stage && data.stage.id) {
        const sf_oppo_stages = await runtime.proxy({
            method: 'GET',
            path: `/query`,
            params: {
                q: `SELECT Id, MasterLabel,ForecastCategoryName,IsActive,DefaultProbability FROM OpportunityStage` 
            }
        });
        console.log(sf_oppo_stages)
        const stage_name = sf_oppo_stages.records.filter((sf_stage) => sf_stage.Id.substring(0, 15) === data.stage.id)[0]?.MasterLabel || null;
        console.log(stage_name)
        if(stage_name) fields.StageName = stage_name; 
    }

    console.log(fields)

    // Call the Salesforce API to PATCH an Opportunity
    const response = await runtime.proxy({
        method: 'PATCH',
        path: `/sobjects/Opportunity/${id}`, 
        body: fields
    });

    // Handle errors from the API response
    if (response.status === 'error') {
        switch (response.category) {
            default:
                throw new Error(Error.Type.UNKNOWN_ERROR, response.message);
        }
    }

    const loadUpdatedResource = await Retrieve.run(runtime , { id, remote_fields:[ 'Id', 'CreatedDate', 'LastModifiedDate'] })

    if (!(loadUpdatedResource instanceof Error)) {
        const resource = new ResourceEvent({
            id: id.substring(0, 15),
            created_at: new Date(loadUpdatedResource.created_at).toISOString(),
            updated_at: new Date(loadUpdatedResource.updated_at).toISOString()
        }, Crm.Opportunity)

        return resource;
    } else {
        throw new Error(Error.Type.UNKNOWN_ERROR);
    }

}, metadata);
