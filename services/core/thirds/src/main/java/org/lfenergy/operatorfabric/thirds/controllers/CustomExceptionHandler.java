/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

package org.lfenergy.operatorfabric.thirds.controllers;

import lombok.extern.slf4j.Slf4j;
import org.lfenergy.operatorfabric.springtools.error.model.ApiError;
import org.lfenergy.operatorfabric.springtools.error.model.ApiErrorException;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;
import org.springframework.web.context.request.WebRequest;
import org.springframework.web.servlet.mvc.method.annotation.ResponseEntityExceptionHandler;

import java.io.FileNotFoundException;
import java.io.IOException;

/**
 * CustomExceptionHandler
 */
@RestControllerAdvice
@Slf4j
public class CustomExceptionHandler extends ResponseEntityExceptionHandler {

  public static final String GENERIC_MSG = "Caught exception at API level";

  @ExceptionHandler(IOException.class)
  public ResponseEntity<Object> handleIOException(IOException exception, final WebRequest request) {
    log.warn(GENERIC_MSG,exception);
    ApiError error = ApiError.builder()
       .status(HttpStatus.BAD_REQUEST)
       .message("Unable to load resource with specified request parameters")
       .error(exception.getMessage())
       .build();
    return new ResponseEntity<>(error, error.getStatus());
  }

  @ExceptionHandler(FileNotFoundException.class)
  public ResponseEntity<Object> handleFileNotFoundException(FileNotFoundException exception, final WebRequest
     request) {
    log.info(GENERIC_MSG,exception);
    ApiError error = ApiError.builder()
       .status(HttpStatus.NOT_FOUND)
       .message("The specified resource does not exist")
       .error(exception.getMessage())
       .build();
    return new ResponseEntity<>(error, error.getStatus());
  }

  @ExceptionHandler(ApiErrorException.class)
  public ResponseEntity<Object> handleApiError(ApiErrorException exception, final WebRequest
     request) {
    log.info(GENERIC_MSG,exception);
    return new ResponseEntity<>(exception.getError(), exception.getError().getStatus());
  }

}