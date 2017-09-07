# Find Azure VMs based on private IP Addresses

Some scenarios might require finding a VM by one of the private IP addresses assigned to those VMs without knowing the actual name of the Virtual Machine.

You might wonder when that happens, but one of my customers has such a scenario in relationship with Cloud Foundry / Bosh. That customer executes scripts inside of VMs provisioned by Bosh and modify configurations of those VMs through applications/scripts running inside of the VMs that Bosh cannot modify (most of those are IaaS Provider Specific, hence getting Cloud Foundry / Bosh to enable those would be counter-productive in this context).

This repository contains two examples that demonstrate, how-to find a VM when knowing a private IP address that should be assigned to the VM. The thing is not hard, but not obvious, either. With public IPs it would be simple because they are dedicated ARM resources. Private IPs are not dedicated ARM resources and are bound to the IP-Configurations of the Network Interface Card Resource. Hence scripts/applications need to take indrections through NIC-resources.

[Azure CLI 2.0](https://docs.microsoft.com/en-us/cli/azure/install-azure-cli?view=azure-cli-latest) based version
-------------------------------
The script `findVmByInternalIp.sh` relies on the Azure CLI 2.0, which is Python based:

```bash
$ ./findVmByInternalIp.sh -r yourresourcegroupname -i 10.0.2.4

{
  "availabilitySet": null,
  "diagnosticsProfile": {
    "bootDiagnostics": {
      "enabled": true,
      "storageUri": "https://xyzxyzxyz.blob.core.windows.net/"
    }
  },
  "hardwareProfile": {
    "vmSize": "Standard_DS1_V2"
  },
  "id": "/subscriptions/yoursubscriptionid/resourceGroups/yourresourcegroup/providers/Microsoft.Compute/virtualMachines/yourvmname",
  "instanceView": null,
  "licenseType": null,
  "location": "westeurope",
  "name": "yourvmname",
  "networkProfile": {
... etc. etc. etc. ......
```

[NodeJs](https://docs.microsoft.com/en-us/nodejs/azure/?view=azure-node-2.0.0) based version
------------------------
With this you find a NodeJs-based script that relies on the Node SDK for Azure 2.0. Note that it needs a NodeJs version that supports `async/await`-keywords (i.e. Node >= 8.x) installed on your machine! Note that this script relies on a [service principal configured in Azure AD](https://docs.microsoft.com/en-us/cli/azure/create-an-azure-service-principal-azure-cli?toc=%2Fazure%2Fazure-resource-manager%2Ftoc.json&view=azure-cli-latest) and expects the AppId/ClientId, the secret/password and the AAD domain name set as environment variables before execution.

```bash
$ CLIENT_ID="yourserviceprincipalclientid"
$ CLIENT_SECRET="yourserviceprincipalclientsecret"
$ TENANT_DOMAIN="youraaddomainname.onmicrosoft.com"
$ node -v
v8.1.3
$ node .\findVmByInternalIp.js --resourcegroup yourresourcegroupname --privateip 10.0.2.5 --subscription yoursubscriptionid

Reading environment variables...
>> Successfully read environment variables!
Reading command line arguments...
>> Successfully read command line arguments!

Signing in with service principal...
>> Successfully signed in with service principal!

Retrieving network interfaces and searching for interface with IP 10.0.2.5...
>> Found NIC with IP: /subscriptions/yoursubscriptionid/resourceGroups/yourresourcegroupname/providers/Microsoft.Network/networkInterfaces/nicname!

Retrieving virtual machine with id=/subscriptions/yoursubscriptionid/resourceGroups/yourresourcegroupname/providers/Microsoft.Compute/virtualMachines/yourvmname...
>> Successfully retrieved virtual machine!
>> Found Virtual Machine:
   - VM Name:   yourvmname
   - VM Size:   Standard_DS1_V2
   - VM Id:     /subscriptions/yoursubscriptionid/resourceGroups/yourresourcegroupname/providers/Microsoft.Compute/virtualMachines/yourvmname
>> Done!!

$
```