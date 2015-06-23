var soap = require('soap'),
  events = require('events'),
  sys = require('sys');

var API = function(opts) {
  var self = this;
  this.auth = {
    'UserName': opts.username,
    'Password': opts.password
  };
  if (opts.dev === "true") {
    this.url = 'https://testsystem.globalsign.com/kb/ws/v1/';
  } else {
    this.url = 'https://system.globalsign.com/kb/ws/v1/';
  }

  console.log(this.url);

  soap.createClient(this.url + 'ServerSSLService?wsdl', function(err, client) {
    if (err) return err;
    self.client = client;
    self.emit('ready');
  });
};

sys.inherits(API, events.EventEmitter);


/**
 * Get Account Info
 * This function allows you to retrieve the balance and usage from your GCC account.
 * @param {Function} callback
 */
API.prototype.getAccountInfo = function(callback) {
  var params = {
    'Request': {
      'QueryRequestHeader': {
        'AuthToken': this.auth
      }
    }
  };
  soap.createClient(this.url + 'AccountService?wsdl', function(err, client) {
    if (err) return err;
    client.AccountSnapshot(params, function(err, result, raw, soapHeader) {
      if (err) return callback({
        'status': '500',
        'output': {
          'result': 'error',
          'message': err
        }
      }, undefined);
      callback(undefined, {
        'status': '200',
        'output': {
          'result': 'ok',
          'message': result
        }
      });
    });
  });
};

/**
  * Extract Common Name from the CSR
  * DomainSSL & AlphaSSL Certificates
  * @param {String} csr - CSR
  * @param {String} ptype - Product Type (DV_LOW, DV, OV, EV);
                      DV_LOW  - AlphaSSL
                      DV      - DomainSSL
                      OV      - OrganizationSSL
                      EV      - ExtendedSSL
                      DV_LOW_SHA2  - AlphaSSL SHA256
                      DV_SHA2      - DomainSSL SHA256
                      OV_SHA2      - OrganizationSSL SHA256
                      EV_SHA2      - ExtendedSSL SHA256
  * @param {Function} callback
  */
API.prototype.asslDecodeCSR = function(csr, ptype, callback) {
  var params = {
    'Request': {
      'QueryRequestHeader': {
        'AuthToken': this.auth
      },
      'CSR': csr,
      'ProductType': ptype
    }
  };
  soap.createClient(this.url + 'GASService?wsdl', function(err, client) {
    if (err) return err;
    client.DecodeCSR(params, function(err, result, raw, soapHeader) {
      if (err) return callback({
        'status': '500',
        'output': {
          'result': 'error',
          'message': err
        }
      }, undefined);
      callback(undefined, {
        'status': '200',
        'output': {
          'result': 'ok',
          'message': result
        }
      });
    });
  });
};

/**
 * GetDVApproverList Request
 * DomainSSL & AlphaSSL Certificates
 * @param {String} fqdn - is the CommonName from previous response (asslDecodeCSR)
 * @param {Function} callback
 */
// <DecodeCSR> <Response> <CSRData> (<CommonName>)? = fdqn
API.prototype.asslGetDVApproverList = function(fqdn, callback) {
  var params = {
    namespace: 'http://stub.query.gasapiserver.esp.globalsign.com',
    'Request': {
      'QueryRequestHeader': {
        'AuthToken': this.auth
      },
      'FQDN': fqdn
    }
  };
  this.client.GetDVApproverList(params, function(err, result, raw, soapHeader) {
    if (err) return callback({
      'status': '500',
      'output': {
        'result': 'error',
        'message': err
      }
    }, undefined);
    callback(undefined, {
      'status': '200',
      'output': {
        'result': 'ok',
        'message': result
      }
    });
  });
};

/**
  * DVOrder Request Email Validation
  * Order AlphaSSL or DomainSSL Certificate with Approver Email validation
  * @param {Array} order - Contains Order details
                      pcode           - DV(domain), DV_LOW(alpha)
                      orderkind       - new,renewal,transfer
                      licenses        - 1 ~ 99
                      months          - Int
                      csr             - String
                      orderid         - String
                      approveremail   - String
                      contacinfo      - Array
                        fname         - String
                        lname         - String
                        phone         - String
                        email         - String
                      contacinfo2     - Array
                        fname         - String
                        lname         - String
                        email         - String
  * @param {Bool} wildc - Wildcard ?
  * @param {Function} callback
  */
API.prototype.asslDVOrderEmail = function(order, wildc, callback) {
  console.log("   ####   SYSTEM  ####");
  console.log(order);
  console.log(wildc);
  console.log("######################");
  var params = {
    namespace: 'http://stub.order.gasapiserver.esp.globalsign.com',
    'Request': {
      'OrderRequestHeader': {
        'AuthToken': this.auth,
      },
      'OrderRequestParameter': {
        'ProductCode': order.pcode+'_SHA2',
        'OrderKind': order.orderkind,
        'Licenses': order.licenses,
        'ValidityPeriod': {
          'Months': order.months
        },
        'CSR': order.csr
      },
      'OrderID': order.orderid,
      'ApproverEmail': order.approveremail,
      'ContactInfo': {
        'FirstName': order.contactinfo.fname,
        'LastName': order.contactinfo.lname,
        'Phone': order.contactinfo.phone,
        'Email': order.contactinfo.email
      },
      'SecondContactInfo': {
        'FirstName': order.contactinfo2.fname,
        'LastName': order.contactinfo2.lname,
        'Email': order.contactinfo2.email
      }
    }
  };
  if (wildc === true) {
    params.Request.OrderRequestParameter.BaseOption = 'wildcard';
  }
  this.client.DVOrder(params, function(err, result, raw, soapHeader) {
    if (err) return callback({
      'status': '500',
      'output': {
        'result': 'error',
        'message': err
      }
    }, undefined);
    callback(undefined, {
      'status': '200',
      'output': {
        'result': 'ok',
        'message': result
      }
    });
  });
};


/**
  * DVOrder Request Metatag Validation
  * Order AlphaSSL or DomainSSL Certificate with Approver Email validation
  * @param {Array} order - Contains Order details
                      pcode           - DV_HIGH_URL(domain), DV_LOW_URL(alpha)
                      orderkind       - new,renewal,transfer
                      licenses        - 1 ~ 99
                      months          - Int
                      csr             - String
                      orderid         - String
                      approveremail   - String
                      contacinfo      - Array
                        fname         - String
                        lname         - String
                        phone         - String
                        email         - String
                      contacinfo2     - Array
                        fname         - String
                        lname         - String
                        email         - String
  * @param {Bool} wildc - Wildcard ?
  * @param {Function} callback
  */
API.prototype.asslDVOrderMetatag = function(order, wildc, callback) {
  var params = {
    namespace: 'http://stub.order.gasapiserver.esp.globalsign.com',
    'Request': {
      'OrderRequestHeader': {
        'AuthToken': this.auth,
      },
      'OrderRequestParameter': {
        'ProductCode': order.pcode+'_SHA2',
        'OrderKind': order.orderkind,
        'Licenses': order.licenses,
        'ValidityPeriod': {
          'Months': order.months
        },
        'CSR': order.csr
      },
      'OrderID': order.orderid,
      'ApproverEmail': order.approveremail,
      'ContactInfo': {
        'FirstName': order.contacinfo.fname,
        'LastName': order.contacinfo.lname,
        'Phone': order.contacinfo.phone,
        'Email': order.contacinfo.email
      },
      'SecondContactInfo': {
        'FirstName': order.contacinfo2.fname,
        'LastName': order.contacinfo2.lname,
        'Email': order.contacinfo2.email
      }
    }
  };
  if (wildc === true) {
    params.Request.OrderRequestParameter.BaseOption = 'wildcard';
  }
  this.client.URLVerification(params, function(err, result, raw, soapHeader) {
    if (err) return callback({
      'status': '500',
      'output': {
        'result': 'error',
        'message': err
      }
    }, undefined);
    callback(undefined, {
      'status': '200',
      'output': {
        'result': 'ok',
        'message': result
      }
    });
  });
};

/**
 * URL Verification for Issue Request
 * Order AlphaSSL or DomainSSL Certificate with Metatag Approver validation
 * @param {String} orderid
 * @param {String} aproverurl
 * @param {Function} callback
 */
API.prototype.URLVerificationForIssue = function(orderid, aproverurl, callback) {
  var params = {
    namespace: 'https://system.globalsign.com/bb/ws/',
    'Request': {
      'OrderRequestHeader': {
        'AuthToken': this.auth,
      },
      'OrderID': orderid,
      'ApproverURL': aproverurl
    }
  };
  this.client.URLVerificationForIssue(params, function(err, result, raw, soapHeader) {
    if (err) return callback({
      'status': '500',
      'output': {
        'result': 'error',
        'message': err
      }
    }, undefined);

    callback(undefined, {
      'status': '200',
      'output': {
        'result': 'ok',
        'message': result
      }
    });
  });
};


/**
  * DVOrder Request DNS txt Validation
  * Order AlphaSSL or DomainSSL Certificate with Approver Email validation
  * @param {Array} order - Contains Order details
                      pcode           - DV_HIGH_DNS(domain), DV_LOW_DNS(alpha)
                      orderkind       - new,renewal,transfer
                      licenses        - 1 ~ 99
                      months          - Int
                      csr             - String
                      orderid         - String
                      approveremail   - String
                      contacinfo      - Array
                        fname         - String
                        lname         - String
                        phone         - String
                        email         - String
                      contacinfo2     - Array
                        fname         - String
                        lname         - String
                        email         - String
  * @param {Bool} wildc - Wildcard ?
  * @param {Function} callback
  */
API.prototype.asslDVOrderDNS = function(order, wildc, callback) {
  var params = {
    namespace: 'http://stub.order.gasapiserver.esp.globalsign.com',
    'Request': {
      'OrderRequestHeader': {
        'AuthToken': this.auth,
      },
      'OrderRequestParameter': {
        'ProductCode': order.pcode+'_SHA2',
        'OrderKind': order.orderkind,
        'Licenses': order.licenses,
        'ValidityPeriod': {
          'Months': order.months
        },
        'CSR': order.csr
      },
      'OrderID': order.orderid,
      'ApproverEmail': order.approveremail,
      'ContactInfo': {
        'FirstName': order.contacinfo.fname,
        'LastName': order.contacinfo.lname,
        'Phone': order.contacinfo.phone,
        'Email': order.contacinfo.email
      },
      'SecondContactInfo': {
        'FirstName': order.contacinfo2.fname,
        'LastName': order.contacinfo2.lname,
        'Email': order.contacinfo2.email
      }
    }
  };
  if (wildc === true) {
    params.Request.OrderRequestParameter.BaseOption = 'wildcard';
  }
  this.client.DVDNSOrder(params, function(err, result, raw, soapHeader) {
    if (err) return callback({
      'status': '500',
      'output': {
        'result': 'error',
        'message': err
      }
    }, undefined);
    callback(undefined, {
      'status': '200',
      'output': {
        'result': 'ok',
        'message': result
      }
    });
  });
};

/**
 * DVDNS Order for Issue Request
 * Order AlphaSSL or DomainSSL Certificate with DNS TXT Approver validation
 * @param {String} orderid
 * @param {String} aproverfqdn
 * @param {Function} callback
 */
API.prototype.DVDNSVerificationForIssue = function(orderid, aproverfqdn, callback) {
  var params = {
    namespace: 'https://system.globalsign.com/bb/ws/',
    'Request': {
      'OrderRequestHeader': {
        'AuthToken': this.auth,
      },
      'OrderID': orderid,
      'ApproverFQDN': aproverfqdn
    }
  };
  this.client.DVDNSVerificationForIssue(params, function(err, result, raw, soapHeader) {
    if (err) return callback({
      'status': '500',
      'output': {
        'result': 'error',
        'message': err
      }
    }, undefined);

    callback(undefined, {
      'status': '200',
      'output': {
        'result': 'ok',
        'message': result
      }
    });
  });
};


/**
  * Ordering OrganizationSSL Certificates
  * Ordering the OrganizationSSL Certificate
  * @param {Array} order - Contains Order details
                      pcode           - OV
                      orderkind       - new,renewal,transfer
                      licenses        - 1 ~ 99
                      months          - Int
                      csr             - String
                      orderid         - String
                      approveremail   - String
                      orginfo         - Array
                        name          - String
                        addr          - String
                          addrline1   - String
                          city        - String
                          region      - String
                          postal      - String
                          phone       - String
                      contacinfo      - Array
                        fname         - String
                        lname         - String
                        phone         - String
                        email         - String
  * @param {Function} callback
  */
API.prototype.orgsslDVOrder = function(order, callback) {
  var params = {
    namespace: 'http://stub.order.gasapiserver.esp.globalsign.com',
    'Request': {
      'OrderRequestHeader': {
        'AuthToken': this.auth,
      },
      'OrderRequestParameter': {
        'ProductCode': 'OV',
        'OrderKind': order.orderkind,
        'Licenses': order.licenses,
        'ValidityPeriod': {
          'Months': order.months
        },
        'CSR': order.csr
      },
      'OrderID': order.orderid,
      'ApproverEmail': order.approveremail,
      'OrganizationInfo': {
        'OrganizationName': order.orginfo.name,
        'OrganizationAddress': {
          'AddressLine1': order.orginfo.addr.addrline1,
          'City': order.orginfo.addr.city,
          'Region': order.orginfo.addr.region,
          'PostalCode': order.orginfo.addr.postal,
          'Country': order.orginfo.addr.country,
          'Phone': order.orginfo.addr.phone
        }
      },
      'ContactInfo': {
        'FirstName': order.contacinfo.fname,
        'LastName': order.contacinfo.lname,
        'Phone': order.contacinfo.phone,
        'Email': order.contacinfo.email
      }
    }
  };
  this.client.OVOrder(params, function(err, result, raw, soapHeader) {
    if (err) return callback({
      'status': '500',
      'output': {
        'result': 'error',
        'message': err
      }
    }, undefined);
    callback(undefined, {
      'status': '200',
      'output': {
        'result': 'ok',
        'message': result
      }
    });
  });
};


/**
  * Ordering ExtendedSSL Certificates
  * Ordering the ExtendedSSL Certificate
  * @param {Array} order - Contains Order details
                      pcode           - DV, DV_LOW
                      orderkind       - new,renewal,transfer
                      licenses        - 1 ~ 99
                      months          - Int
                      csr             - String
                      orderid         - String
                      approveremail   - String
                      orginfo         - Array
                        catcode       - String (PO:Private Organization, GE:Government Entity, BE:BusinessEntity)
                        addr          - Array
                          addrline1   - String
                          city        - String
                          region      - String
                          postal      - String
                          phone       - String
                      reqinfo         - Array
                        fname         - String
                        lname         - String
                        orgname       - String
                        phone         - String
                        email         - String
                      approverinfo    - Array
                        fname         - String
                        lname         - String
                        orgname       - String
                        phone         - String
                        email         - String
                      asinfo          - Array
                        orgname       - String
                        state         - String
                        locality      - String
                        number        - String
                      jurisinfo       - Array
                        country       - String
                        fname         - String
                        lname         - String
                        phone         - String
                        email         - String
                      contacinfo      - Array
                        fname         - String
                        lname         - String
                        phone         - String
                        email         - String
  * @param {Function} callback
  */
API.prototype.evsslDVOrder = function(order, callback) {
  var params = {
    namespace: 'http://stub.order.gasapiserver.esp.globalsign.com',
    'Request': {
      'OrderRequestHeader': {
        'AuthToken': this.auth,
      },
      'OrderRequestParameter': {
        'ProductCode': 'EV',
        'OrderKind': order.orderkind,
        'Licenses': order.licenses,
        'ValidityPeriod': {
          'Months': order.months
        },
        'CSR': order.csr
      },
      'OrganizationInfoEV': {
        'BusinessCategoryCode': order.orginfo.catcode,
        'OrganizationAddress': {
          'AddressLine1': order.orginfo.addr.addrline1,
          'City': order.orginfo.addr.city,
          'Region': order.orginfo.addr.region,
          'PostalCode': order.orginfo.addr.postal,
          'Country': order.orginfo.addr.country,
          'Phone': order.orginfo.addr.phone
        }
      },
      'RequestorInfo': {
        'FirstName': order.reqinfo.fname,
        'LastName': order.reqinfo.lname,
        'OrganizationName': order.reqinfo.orgname,
        'Phone': order.reqinfo.phone,
        'Email': order.reqinfo.email
      },
      'ApproverInfo': {
        'FirstName': order.approverinfo.fname,
        'LastName': order.approverinfo.lname,
        'OrganizationName': order.approverinfo.orgname,
        'Phone': order.approverinfo.phone,
        'Email': order.approverinfo.email
      },
      'AuthorizedSignerInfo': {
        'OrganizationName': order.asinfo.orgname,
        'StateOrProvince': order.asinfo.state,
        'Locality': order.asinfo.locality,
        'IncorporatingAgencyRegistrationNumber': order.asinfo.number,
      },
      'JurisdictionInfo': {
        'JurisdictionCountry': order.jurisinfo.country,
        'FirstName': order.jurisinfo.fname,
        'LastName': order.jurisinfo.lname,
        'Phone': order.jurisinfo.phone,
        'Email': order.jurisinfo.email
      },
      'ContactInfo': {
        'FirstName': order.contacinfo.fname,
        'LastName': order.contacinfo.lname,
        'Phone': order.contacinfo.phone,
        'Email': order.contacinfo.email
      }
    }
  };
  this.client.EVOrder(params, function(err, result, raw, soapHeader) {
    if (err) return callback({
      'status': '500',
      'output': {
        'result': 'error',
        'message': err
      }
    }, undefined);
    callback(undefined, {
      'status': '200',
      'output': {
        'result': 'ok',
        'message': result
      }
    });
  });
};

module.exports = API;
