<template>
  <v-container fluid>
    <v-row>
      <v-col>
        <v-card width="375px">
          <v-card-title>Your seller profile</v-card-title>
          <v-form ref="form" v-model="valid" :disabled="submitting">
            <v-card-text>
              <p>
                This is how you will be known in the market.
              </p>
              <v-text-field
                v-model="name"
                :rules="[required]"
                label="Seller name"
                outlined
              />
              <p>
                The location that will be displayed in the market for local pick ups.
                It should not be a street address.
              </p>
              <v-text-field
                v-model="location"
                :rules="[required]"
                label="Your location"
                outlined
              />
            </v-card-text>
          </v-form>
          <v-card-text>
            <v-btn
              color="primary"
              :disabled="!valid"
              :loading="submitting"
              @click="submit"
            >
              Submit
            </v-btn>
          </v-card-text>
        </v-card>
      </v-col>
    </v-row>
  </v-container>
</template>
<script>
export default {
  layout: 'market',
  async fetch () {
    // If we came from the add a frag page, we will have an incoming fragId
    this.fragId = this.$route.query.fragId
    const { user, seller } = await this.$axios.$get('/api/market/seller')
    this.user = user
    this.seller = seller
    if (seller) {
      this.name = seller.name
      this.location = seller.location
    } else {
      this.name = user.name
      this.location = user.location
    }
  },

  data: () => ({
    // If we came from the add a frag page, we will have an incoming fragId
    fragId: undefined,
    // Inputs we get from the server
    user: {},
    seller: undefined,
    // Stuff the user enters
    name: undefined,
    location: undefined,
    // Submitting
    submitting: false,
    valid: false
  }),

  methods: {
    // Validation
    required (value) {
      if (!value) {
        return 'This field is required'
      }
      return true
    },
    // Submit
    async submit () {
      this.submitting = true
      try {
        const formData = new FormData()
        if (this.seller) {
          formData.set('sellerId', this.seller.sellerId)
        }
        formData.set('name', this.name)
        formData.set('location', this.location)
        const { seller } = await this.$axios.$post('/api/market/seller', formData)
        this.seller = seller
        // If we came in with a fragId, redirect
        if (this.fragId) {
          this.$router.replace(`/market/add/${this.fragId}`)
        }
      } finally {
        this.submitting = false
      }
    }
  }
}
</script>
