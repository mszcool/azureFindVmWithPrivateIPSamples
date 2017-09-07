#!/bin/bash

#
# This script finds a VM by its assigned, internal IP address.
# For deployments where you know the IP address of the VM but do not know the VM name (e.g. when using a tool like
# Bosh to deploy the VM), this can be handy.
#

help() {
    echo "This script finds a VM in a resource group based on its internal, assigned IP address"
    echo "Options:"
    echo "  -r     The name of the resource group to seach within"
    echo "  -i     The static IPv4 address"
    echo "Sample:"
    echo "findVmByInternalIp -r yourresourcegroup -i 10.0.0.1"
}

#
# Parse the parameters
#
while getopts ":r:i:" opt; do
    case $opt in 
        r)
        resourceGroup="$OPTARG"
        ;;

        i)
        searchIpAddress="$OPTARG"
        ;;

        \?)
        echo "Invalid option: -$OPTARG"
        help
        exit -1
    esac
done    

#
# First we need to find the NIC with the corresponding, internal static IP address
#
nicJson=`az network nic list --resource-group $resourceGroup \
                             --query "[?ipConfigurations[0].privateIpAddress=='${searchIpAddress}'].{ nicId: id, vm: virtualMachine }" \
                             --out json`

#
# Then we need to navigate from the NIC to the VM and output the final VM structure
#
vmId=`echo "$nicJson" | jq --raw-output ".[].vm.id"`
az vm show --id $vmId --out json