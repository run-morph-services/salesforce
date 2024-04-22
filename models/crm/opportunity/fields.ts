import { Crm } from '@run-morph/models';
import { Fields, RemoteField, Metadata, Runtime } from '@run-morph/sdk';

const metadata: Metadata<Crm.Opportunity> = {
    model: Crm.Opportunity,
    scopes: [],
    fields: {
        name: {
            remote_keys: ['Name'],
            operations: ['list', 'retrieve']
        },
        description: {
            remote_keys: ['Description'],
            operations: ['list', 'retrieve']
        },
        amount: {
            remote_keys: ['Amount'],
            operations: ['list', 'retrieve']
        },
        currency: {
            remote_keys: ['CurrencyIsoCode'],
            operations: ['list', 'retrieve']
        },
        win_probability: {
            remote_keys: ['Probability'],
            operations: ['list', 'retrieve']
        },
        stage: {
            remote_keys: ['StageName'],
            operations: ['list', 'retrieve', 'update']
        },
        closed_at: {
            remote_keys: ['CloseDate'],
            operations: ['list', 'retrieve']
        },
        // Adjusted fields to match Salesforce schema
        // Removed the 'status' field as it does not directly map to Salesforce Opportunity fields
        pipeline: {
            remote_keys: ['Pipeline'],
            operations: ['list', 'retrieve']
        },
        contacts: {
            remote_keys: ['ContactId'], // Assuming a custom field or relationship
            operations: ['retrieve']
        },
        companies: {
            remote_keys: ['AccountId'], // Using AccountId to relate to companies
            operations: ['retrieve']
        }
    }
};

// Adjusted to fetch Salesforce Opportunity fields
export default new Fields(async (runtime: Runtime) => {
    const response = await runtime.proxy({
        method: 'GET',
        path: '/sobjects/Opportunity/describe' // Replace XX with the API version
    });

    return response.fields.map((sf_field) => new RemoteField({
        remote_field_key: sf_field.name,
        label: sf_field.label,
        operations: sf_field.updateable ? ['create', 'list', 'retrieve', 'update'] : ['retrieve', 'list'],
        value_type: sf_field.type === 'int' || sf_field.type === 'double' ? 'number' : 'text', // Adjust types as needed
        read_path: ['fields', ...[sf_field.name]],
        write_path: ['fields', ...[sf_field.name]]
    }))
}, metadata);