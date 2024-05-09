/**
 * @file contract
 * @author atom-yang
 */
// eslint-disable-next-line max-classes-per-file
import * as protobuf from '@aelfqueen/protobufjs';
import ContractMethod from './contractMethod';
import { noop } from '../util/utils';
import { deserializeLogSync } from '../util/proto';

const getServicesFromFileDescriptors = descriptors => {
  const root = protobuf.Root.fromDescriptor(descriptors, 'proto3').resolveAll();
  return descriptors.file.filter(f => f.service.length > 0).map(f => {
    const sn = f.service[0].name;
    const fullName = f.package ? `${f.package}.${sn}` : sn;
    return root.lookupService(fullName);
  });
};

class Contract {
  constructor(chain, services, address) {
    this._chain = chain;
    this.address = address;
    this.services = services;
    console.log(services, 'services');
  }

  deserializeLog(logs = [], logName) {
    const logInThisAddress = logs.filter(
      v => v.Address === this.address && v.Name === logName
    );
    return deserializeLogSync(logInThisAddress, this.services);
  }
}

export default class ContractFactory {
  constructor(chain, fileDescriptorSet, wallet) {
    this.chain = chain;
    this.services = getServicesFromFileDescriptors(fileDescriptorSet);
    this.wallet = wallet;
  }

  static bindMethodsToContract(contract, wallet) {
    contract.services.forEach(service => {
      Object.keys(service.methods).forEach(key => {
        const method = service.methods[key].resolve();
        const contractMethod = new ContractMethod(contract._chain, method, contract.address, wallet);
        contractMethod.bindMethodToContract(contract);
      });
    });
  }

  at(address, callback = noop) {
    const contractInstance = new Contract(this.chain, this.services, address);
    ContractFactory.bindMethodsToContract(contractInstance, this.wallet);
    callback(null, contractInstance);
    return contractInstance;
  }
}
