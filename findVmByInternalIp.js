'use strict';

var util = require('util');
var async = require('async');
var cmdArgs = require('command-line-args');
var msAzureRest = require('ms-rest-azure');
var ComputeManagementClient = require('azure-arm-compute');
var NetworkManagementClient = require('azure-arm-network');
var ArmClient = require('azure-arm-resource').ResourceManagementClient;

//
// Reading required environment variables
//
console.log("Reading environment variables...");
var clientId = process.env['CLIENT_ID'];
var clientSecret = process.env['CLIENT_SECRET'];
var tenantDomain = process.env['TENANT_DOMAIN'];
if( (clientId === undefined) || (clientSecret === undefined) || (tenantDomain === undefined) ) {
    console.error(">> FAILED Reading environment variables! Required: CLIENT_ID, CLIENT_SECRET, TENANT_DOMAIN!");
    process.exit(10);
}
console.log(">> Successfully read environment variables!");

//
// Then parse the command line arguments
//
const argumentDefinitions = [
    { name: "resourcegroup", alias: "r", type: String },
    { name: "privateip", alias: "p", type: String },
    { name: "subscription", alias: "s", type: String }
];
console.log("Reading command line arguments...");
var argsProvided = cmdArgs(argumentDefinitions);
if( (!argsProvided.resourcegroup) || (!argsProvided.privateip) || (!argsProvided.subscription)) {
    console.error("Missing command line arguments --resource-group (-r) or --private-ip (-p) or --subscription (-s)!");
    process.exit(20);
}
console.log(">> Successfully read command line arguments!")

//
// Next log-on with the service principal using the Azure ARM SDK for NodeJs
//
console.log("Signing in with service principal...");
msAzureRest.loginWithServicePrincipalSecret(clientId, clientSecret, tenantDomain, async function(err, credentials, subscriptions) {

    // If there was an error, stop the process
    if(err) {
        console.error(err);
        process.exit(30);
    } else {
        console.log(">> Successfully signed in with service principal!");
    }

    // Next select the subscription based on the provided parameters
    checkIfSubscriptionExists(argsProvided.subscription, subscriptions);
 
    // Now start the flow for finding a VM based on its private IP Address
    await getNicWithPrivateIp(argsProvided.resourcegroup, argsProvided.privateip, argsProvided.subscription, credentials).then(async function(foundConfigsWithVms) {
        foundConfigsWithVms.forEach(async function(item) {
            await getVirtualMachineById(item.virtualMachine.id, argsProvided.subscription, credentials).then(function(vm) {
                console.log(">> Found Virtual Machine: ");
                console.log("   - VM Name:\t%s", vm.name);
                console.log("   - VM Size:\t%s", vm.hardwareProfile.vmSize)
                console.log("   - VM Id:  \t%s", vm.id);

                // Done processing
                console.log(">> Done!!");
                process.exit(0);
            });
        });
    });
});

/*
 * Function for verifying if the subscription passed in does exist in the list of available subscriptions.
 */
function checkIfSubscriptionExists(subscriptionId, subscriptions) {
    var indexOfSubscription = subscriptions.findIndex(function(s) {
        return s.id === argsProvided.subscription;
    });
    if(indexOfSubscription < 0) {
        console.error("Requested subscription %s does not exist in list of available subscriptions!", argsProvided.subscription);
        console.log("Available subscriptions: ");
        subscriptions.forEach(function(s) {
            console.log("- %s with id %s", s.name, s.id);
        });
        process.exit(40);
    }
}

/*
 * Function for retrieving a network interface card resource within the selected resource group
 */
async function getNicWithPrivateIp(resourceGroup, privateIp, subscription, credentials) {
    var results = [];

    console.log("Retrieving network interfaces and searching for interface with IP %s...", privateIp);
    var networkClient = new NetworkManagementClient(credentials, subscription);
    await networkClient.networkInterfaces.list(resourceGroup, null).then(function(nics) {
        nics.forEach(function(nic) {
            var indexOfIpCfgWithIp = nic.ipConfigurations.findIndex(function(ipcfg) {
                return ipcfg.privateIPAddress === privateIp
            });
            if(indexOfIpCfgWithIp >= 0) {
                console.log(">> Found NIC with IP: %s!", nic.id);
                results.push({ ipConfig: nic.ipConfigurations[indexOfIpCfgWithIp], virtualMachine: nic.virtualMachine });
            }
        });
    }, function(err) {
        console.error(">> Failed retrieving nics because of error:");
        console.error(err);
        process.exit(50);
    });

    return results;
}

/*
 * Function for retrieving the virtual machine object that has the NIC associated!
 */
async function getVirtualMachineById(vmId, subscription, credentials) {
    var result = 0;

    console.log("Retrieving virtual machine with id=%s...", vmId);
    // Very simple and basic splitting function
    // /subscriptions/<<subscriptionid>>/resourceGroups/<<resourcegroup>>/providers/Microsoft.Compute/virtualMachines/<<vmName>>
    var splittedVmId = vmId.split("/");
    var resourceGroup = splittedVmId[4];
    var vmName = splittedVmId[8];

    var vmClient = new ComputeManagementClient(credentials, subscription);
    await vmClient.virtualMachines.get(resourceGroup, vmName).then(
        function(vm) {
            console.log(">> Successfully retrieved virtual machine!");
            result = vm;
        }, 
        function(err) {
            console.error(">> Failed retrieving viurtal machine because of error:");
            console.error(err);
            process.exit(60);
        });

    return result;
}