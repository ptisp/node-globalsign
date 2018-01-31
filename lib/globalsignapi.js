var soap = require('soap'),
  events = require('events'),
  util = require('util');

var API = function(opts) {
  var self = this;
  this.auth = {
    'UserName': opts.username,
    'Password': opts.password
  };
  this.host = opts.host;
  console.log(this.host);

  soap.createClient(this.host + 'ServerSSLService?wsdl', function(err, client) {
    if (err) return err;
    self.client = client;
    self.emit('ready');
  });
};

util.inherits(API, events.EventEmitter);


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
  soap.createClient(this.host + 'AccountService?wsdl', function(err, client) {
    if (err) return err;
    client.AccountSnapshot(params, function(err, result, raw, soapHeader) {
      if (err) return callback({
        'status': '500',
        'output': {
          'result': 'error',
          'message': err
        }
      }, undefined);

      if (result.Response.QueryResponseHeader.SuccessCode == -1) {
        var errors = _getErrorMessage(result.Response.QueryResponseHeader.Errors.Error);
        return callback({
          'status': '500',
          'output': {
            'result': 'error',
            'message': errors
          }
        });
      }

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
  soap.createClient(this.host + 'GASService?wsdl', function(err, client) {
    if (err) return err;
    client.DecodeCSR(params, function(err, result, raw, soapHeader) {
      if (err) return callback({
        'status': '500',
        'output': {
          'result': 'error',
          'message': err
        }
      }, undefined);

      if (result.Response.QueryResponseHeader.SuccessCode == -1) {
        var errors = _getErrorMessage(result.Response.QueryResponseHeader.Errors.Error);
        return callback({
          'status': '500',
          'output': {
            'result': 'error',
            'message': errors
          }
        });
      }

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

    if (result.Response.QueryResponseHeader.SuccessCode == -1) {
      var errors = _getErrorMessage(result.Response.QueryResponseHeader.Errors.Error);
      return callback({
        'status': '500',
        'output': {
          'result': 'error',
          'message': errors
        }
      });
    }

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
        'ProductCode': order.pcode,
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

    if (result.Response.QueryResponseHeader.SuccessCode == -1) {
      var errors = _getErrorMessage(result.Response.QueryResponseHeader.Errors.Error);
      return callback({
        'status': '500',
        'output': {
          'result': 'error',
          'message': errors
        }
      });
    }

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
  if (order.pcode === 'DV') {
    order.pcode = 'DV_HIGH';
  }
  var params = {
    namespace: 'http://stub.order.gasapiserver.esp.globalsign.com',
    'Request': {
      'OrderRequestHeader': {
        'AuthToken': this.auth,
      },
      'OrderRequestParameter': {
        'ProductCode': order.pcode,
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

    if (result.Response.QueryResponseHeader.SuccessCode == -1) {
      var errors = _getErrorMessage(result.Response.QueryResponseHeader.Errors.Error);
      return callback({
        'status': '500',
        'output': {
          'result': 'error',
          'message': errors
        }
      });
    }

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

    if (result.Response.QueryResponseHeader.SuccessCode == -1) {
      var errors = _getErrorMessage(result.Response.QueryResponseHeader.Errors.Error);
      return callback({
        'status': '500',
        'output': {
          'result': 'error',
          'message': errors
        }
      });
    }

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
        'ProductCode': order.pcode,
        'OrderKind': order.orderkind,
        'Licenses': order.licenses,
        'ValidityPeriod': {
          'Months': order.months
        },
        'CSR': order.csr,
        'Options': order.options,
        'RenewalTargetOrderID': order.targetorderid,
        'TargetCERT': order.targetcert
      },
      'OrderID': order.orderid,
      'ApproverEmail': order.approveremail,
      'ContactInfo': {
        'FirstName': order.contacinfo.fname,
        'LastName': order.contacinfo.lname,
        'Phone': order.contacinfo.phone,
        'Email': order.contacinfo.email
      }
    }
  };
  if (order.contacinfo2) {
    params.SecondContactInfo = {
      'FirstName': order.contacinfo2.fname,
      'LastName': order.contacinfo2.lname,
      'Email': order.contacinfo2.email
    };
  }
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

    if (result.Response.OrderResponseHeader.SuccessCode == -1) {
      var errors = _getErrorMessage(result.Response.OrderResponseHeader.Errors.Error);
      return callback({
        'status': '500',
        'output': {
          'result': 'error',
          'message': errors
        }
      });
    }

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

    if (result.Response.OrderResponseHeader.SuccessCode == -1) {
      var errors = _getErrorMessage(result.Response.OrderResponseHeader.Errors.Error);
      return callback({
        'status': '500',
        'output': {
          'result': 'error',
          'message': errors
        }
      });
    }

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

    if (result.Response.QueryResponseHeader.SuccessCode == -1) {
      var errors = _getErrorMessage(result.Response.QueryResponseHeader.Errors.Error);
      return callback({
        'status': '500',
        'output': {
          'result': 'error',
          'message': errors
        }
      });
    }

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

    if (result.Response.QueryResponseHeader.SuccessCode == -1) {
      var errors = _getErrorMessage(result.Response.QueryResponseHeader.Errors.Error);
      return callback({
        'status': '500',
        'output': {
          'result': 'error',
          'message': errors
        }
      });
    }

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
 * Get Issued Certificate – Single Certificate
 * @param {String} orderid
 * @param {Function} callback
 * @param {Object} opts (optional)- Contains request options
                     orderstatus       - 1: INITIAL
                                         2: Waiting for phishing check
                                         3: Cancelled - Not Issued
                                         4: Issue completed
                                         5: Cancelled - Issued
                                         6: Waiting for revocation
                                         7: Revoked
                     returnorder       - String (true/false)
                     returncertificate - String (true/false)
                     returnfulfillment - String (true/false)
                     returncacerts     - String (true/false)
                     returncsr         - String (true/false)
                     returnpkcs        - String (true/false)
                     returnsan         - String (true/false)
 */
API.prototype.GetOrderByOrderID = function(orderid, callback, opts) {
  var params = {
    namespace: 'http://stub.query.gasapiserver.esp.globalsign.com',
    'Request': {
      'QueryRequestHeader': {
        'AuthToken': this.auth,
      },
      'OrderID': orderid
    }
  };

  if (opts) {
    params.Request.OrderQueryOption = {
      'OrderStatus': opts.orderstatus,
      'ReturnOrderOption': opts.returnorder,
      'ReturnCertificateInfo': opts.returncertificate,
      'ReturnFulfillment': opts.returnfulfillment,
      'ReturnCACerts': opts.returncacerts,
      'ReturnOriginalCSR': opts.returncsr,
      'ReturnPKCS12': opts.returnpkcs,
      'ReturnSANEntries': opts.returnsan
    };
  }

  soap.createClient(this.host + 'GASService?wsdl', function(err, client) {
    if (err) return err;
    client.GetOrderByOrderID(params, function(err, result, raw, soapHeader) {
      if (err) return callback({
        'status': '500',
        'output': {
          'result': 'error',
          'message': err
        }
      }, undefined);

      if (result.Response.OrderResponseHeader.SuccessCode == -1) {
        var errors = _getErrorMessage(result.Response.QueryResponseHeader.Errors.Error);
        return callback({
          'status': '500',
          'output': {
            'result': 'error',
            'message': errors
          }
        });
      }

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
 * Searching orders by order date (from/to)
 * @param {String}   fromdate          - YYYY-MM-DDTHH:MM:SS.000Z
 * @param {String}   todate            - YYYY-MM-DDTHH:MM:SS.000Z
 * @param {Function} callback
 * @param {Object}   opts (optional) - Contains request options
                       orderstatus       - 1: INITIAL
                                           2: Waiting for phishing check
                                           3: Cancelled - Not Issued
                                           4: Issue completed
                                           5: Cancelled - Issued
                                           6: Waiting for revocation
                                           7: Revoked
                       returnorder       - String (true/false)
                       returncertificate - String (true/false)
                       returnfulfillment - String (true/false)
                       returncacerts     - String (true/false)
                       returncsr         - String (true/false)
                       returnpkcs        - String (true/false)
                       returnsan         - String (true/false)
 */
API.prototype.GetOrderByDateRange = function(fromdate, todate, callback, opts) {
  var params = {
    namespace: 'http://stub.query.gasapiserver.esp.globalsign.com',
    'Request': {
      'QueryRequestHeader': {
        'AuthToken': this.auth
      },
      'FromDate': fromdate,
      'ToDate': todate
    }
  };

  if (opts) {
    params.Request.OrderQueryOption = {
      'OrderStatus': opts.orderstatus,
      'ReturnOrderOption': opts.returnorder,
      'ReturnCertificateInfo': opts.returncertificate,
      'ReturnFulfillment': opts.returnfulfillment,
      'ReturnCACerts': opts.returncacerts,
      'ReturnOriginalCSR': opts.returncsr,
      'ReturnPKCS12': opts.returnpkcs,
      'ReturnSANEntries': opts.returnsan
    };
  }

  soap.createClient(this.host + 'GASService?wsdl', function(err, client) {
    if (err) return err;
    client.GetOrderByDateRange(params, function(err, result, raw, soapHeader) {
      if (err) return callback({
        'status': '500',
        'output': {
          'result': 'error',
          'message': err
        }
      }, undefined);

      if (result.Response.QueryResponseHeader.SuccessCode == -1) {
        var errors = _getErrorMessage(result.Response.QueryResponseHeader.Errors.Error);
        return callback({
          'status': '500',
          'output': {
            'result': 'error',
            'message': errors
          }
        });
      }

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
 * Request to query for orders with certificates expiring in date range. Check upcoming expirations
 * @param {Function} callback
 * @param {Object}   opts (optional)     - Contains request parameters
                       fromdate          - YYYY-MM-DDTHH:MM:SS.000Z
                       todate            - YYYY-MM-DDTHH:MM:SS.000Z
                       fqdn              - String
                       orderkind         - String
                       orderstatus       - 1: INITIAL
                                           2: Waiting for phishing check
                                           3: Cancelled - Not Issued
                                           4: Issue completed
                                           5: Cancelled - Issued
                                           6: Waiting for revocation
                                           7: Revoked
                       subid             - String
 */
API.prototype.GetOrderByExpirationDate = function(callback, opts) {
  var params = {
    namespace: 'http://stub.query.gasapiserver.esp.globalsign.com',
    'Request': {
      'QueryRequestHeader': {
        'AuthToken': this.auth,
      }
    }
  };

  if (opts) {
    params.Request.ExpirationFromDate = opts.fromdate;
    params.Request.ExpirationToDate = opts.todate;
    params.Request.FQDN = opts.fqdn;
    params.Request.OrderKind = opts.orderkind;
    params.Request.OrderStatus = opts.orderstatus;
    params.Request.SubID = opts.subid;
  }

  soap.createClient(this.host + 'GASService?wsdl', function(err, client) {
    if (err) return err;
    client.GetOrderByExpirationDate(params, function(err, result, raw, soapHeader) {
      if (err) return callback({
        'status': '500',
        'output': {
          'result': 'error',
          'message': err
        }
      }, undefined);

      if (result.Response.QueryResponseHeader.SuccessCode == -1) {
        var errors = _getErrorMessage(result.Response.QueryResponseHeader.Errors.Error);
        return callback({
          'status': '500',
          'output': {
            'result': 'error',
            'message': errors
          }
        });
      }

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
 * Request to query for orders with certificates expiring in date range.
 * @param {Function} callback
 *  * @param {Object}   opts              - Contains request parameters
                        fromdate          - YYYY-MM-DDTHH:MM:SS.000Z
                        todate            - YYYY-MM-DDTHH:MM:SS.000Z
                        fqdn              - String
                        orderkind         - String
                        orderstatus       - 1: INITIAL
                                            2: Waiting for phishing check
                                            3: Cancelled - Not Issued
                                            4: Issue completed
                                            5: Cancelled - Issued
                                            6: Waiting for revocation
                                            7: Revoked
                        subid             - String
                        returnfulfillment - Boolean
                        returncacerts     - Boolean
 */
API.prototype.GetCertificateOrders = function(callback, opts) {
  var params = {
    'Request': {
      'QueryRequestHeader': {
        'AuthToken': this.auth
      }
    }
  };

  if (opts) {
    params.Request.FromDate = opts.fromdate;
    params.Request.ToDate = opts.todate;
    params.Request.FQDN = opts.fqdn;
    params.Request.OrderKind = opts.orderkind;
    params.Request.OrderStatus = opts.orderstatus;
    params.Request.SubID = opts.subid;
  }

  soap.createClient(this.host + 'GASService?wsdl', function(err, client) {
    if (err) return err;
    client.GetCertificateOrders(params, function(err, result, raw, soapHeader) {
      if (err) return callback({
        'status': '500',
        'output': {
          'result': 'error',
          'message': err
        }
      }, undefined);

      if (result.Response.QueryResponseHeader.SuccessCode == -1) {
        var errors = _getErrorMessage(result.Response.QueryResponseHeader.Errors.Error);
        return callback({
          'status': '500',
          'output': {
            'result': 'error',
            'message': errors
          }
        });
      }

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
 * Request to query for orders with certificates expiring in date range.
 * @param {String}   fromdate          - YYYY-MM-DDTHH:MM:SS.000Z
 * @param {String}   todate            - YYYY-MM-DDTHH:MM:SS.000Z
 * @param {Function} callback
 * @param {Object}   opts              - Contains request parameters
                       orderstatus       - 1: INITIAL
                                           2: Waiting for phishing check
                                           3: Cancelled - Not Issued
                                           4: Issue completed
                                           5: Cancelled - Issued
                                           6: Waiting for revocation
                                           7: Revoked
                       returnorder       - String (true/false)
                       returncertificate - String (true/false)
                       returnfulfillment - String (true/false)
                       returncacerts     - String (true/false)
                       returncsr         - String (true/false)
                       returnpkcs        - String (true/false)
                       returnsan         - String (true/false)
 */
API.prototype.GetModifiedOrders = function(fromdate, todate, callback, opts) {
  var params = {
    'Request': {
      'QueryRequestHeader': {
        'AuthToken': this.auth
      },
      'FromDate': fromdate,
      'ToDate': todate
    }
  };

  if (opts) {
    params.Request.OrderQueryOption = {
      'OrderStatus': opts.orderstatus,
      'ReturnOrderOption': opts.returnorder,
      'ReturnCertificateInfo': opts.returncertificate,
      'ReturnFulfillment': opts.returnfulfillment,
      'ReturnCACerts': opts.returncacerts,
      'ReturnOriginalCSR': opts.returncsr,
      'ReturnPKCS12': opts.returnpkcs,
      'ReturnSANEntries': opts.returnsan
    };
  }

  soap.createClient(this.host + 'GASService?wsdl', function(err, client) {
    if (err) return err;
    client.GetModifiedOrders(params, function(err, result, raw, soapHeader) {
      if (err) return callback({
        'status': '500',
        'output': {
          'result': 'error',
          'message': err
        }
      }, undefined);

      if (result.Response.QueryResponseHeader.SuccessCode == -1) {
        var errors = _getErrorMessage(result.Response.QueryResponseHeader.Errors.Error);
        return callback({
          'status': '500',
          'output': {
            'result': 'error',
            'message': errors
          }
        });
      }

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
 * ResendEmail
 * If the user did not receive or lost his Approver Email message you can use the ResendEmail API to resend email
 * @param {String} orderid
 * @param {String} emailtype:
                    use 'APPROVEREMAIL' to Resend the approver email for DVOrder, DVOrderWithoutCSR
 * @param {Function} callback
 */
API.prototype.ResendEmail = function(orderid, emailtype, callback) {
  var params = {
    'Request': {
      'OrderRequestHeader': {
        'AuthToken': this.auth
      },
      'OrderID': orderid,
      'ResendEmailType': emailtype
    }
  };
  this.client.ResendEmail(params, function(err, result, raw, soapHeader) {
    if (err) return callback({
      'status': '500',
      'output': {
        'result': 'error',
        'message': err
      }
    }, undefined);

    if (result.Response.OrderResponseHeader.SuccessCode == -1) {
      var errors = _getErrorMessage(result.Response.OrderResponseHeader.Errors.Error);
      return callback({
        'status': '500',
        'output': {
          'result': 'error',
          'message': errors
        }
      });
    }

    callback(undefined, {
      'status': '200',
      'output': {
        'result': 'ok',
        'message': result
      }
    });
  });
};

var _getErrorMessage = function(errors) {
  var msg = '';

  for (var i = 0; i < errors.length; i++) {
    msg += 'Error ' + errors[i].ErrorCode + ' - ' + (errors[i].ErrorField ? 'Field ' + errors[i].ErrorField + ' - ' : '') + errors[i].ErrorMessage + '\n';
  }

  return msg;
};

module.exports = API;
