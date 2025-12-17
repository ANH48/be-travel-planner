module.exports = function (options, webpack) {
  const lazyImports = [
    '@nestjs/microservices/microservices-module',
    '@nestjs/websockets/socket-module',
    'kafkajs',
    'mqtt',
    'nats',
    'amqplib',
    'amqp-connection-manager',
    '@grpc/proto-loader',
    'mock-aws-s3',
    'aws-sdk',
    'nock',
  ];

  return {
    ...options,
    externals: [
      'bcrypt',
      'class-transformer',
      'class-validator',
    ],
    plugins: [
      ...options.plugins,
      new webpack.IgnorePlugin({
        checkResource(resource) {
          if (!lazyImports.includes(resource)) {
            return false;
          }
          try {
            require.resolve(resource, {
              paths: [process.cwd()],
            });
            return false;
          } catch (err) {
            return true;
          }
        },
      }),
    ],
    module: {
      ...options.module,
      rules: [
        ...options.module.rules,
        {
          test: /\.html$/,
          loader: 'ignore-loader',
        },
      ],
    },
  };
};
