<template>
  <v-container fluid>
    <v-card
      v-if="item"
      elevation="6"
      width="375px"
    >
      <v-card-title v-text="item.name" />
      <v-divider />
      <v-stepper v-model="step" vertical>
        <!-- Step 1 - verify supporting member -->

        <v-stepper-step step="1" :complete="step > 1">
          Confirm eligibility
        </v-stepper-step>
        <v-stepper-content step="1">
          <p>
            In order to borrow the {{ item.shortName }} you must be a
            supporting member for at least {{ item.supportingMemberDays }} days.
          </p>
          <p>
            Did you become a supporting member on or before {{ supportingMemberDate(item.supportingMemberDays) }}?
          </p>
          <v-btn
            small
            depressed
            color="primary"
            @click="++step"
          >
            Yes
          </v-btn>
          <v-btn
            small
            depressed
            color="secondary"
            @click="$router.replace(`/equipment/queue/${item.itemId}`)"
          >
            No
          </v-btn>
        </v-stepper-content>

        <!-- Step 2 - location -->
        <v-stepper-step step="2" :complete="step > 2">
          Enter your location
        </v-stepper-step>
        <v-stepper-content step="2">
          <p />
          <v-autocomplete
            v-model="city"
            outlined
            label="Location"
            :items="places"
            :rules="[validateCity]"
          />
          <v-btn
            small
            depressed
            color="primary"
            :disabled="validateCity(city) !== true"
            @click="++step"
          >
            Continue
          </v-btn>
          <v-btn
            small
            depressed
            color="secondary"
            @click="$router.replace(`/equipment/queue/${item.itemId}`)"
          >
            Cancel
          </v-btn>
        </v-stepper-content>

        <!-- Step 3- enter phone number -->
        <v-stepper-step step="3" :complete="step > 3">
          Enter your phone number
        </v-stepper-step>
        <v-stepper-content step="3">
          <p>You must have a verified phone number to borrow the {{ item.shortName }}.</p>
          <p>We will send a code to this number via SMS. Please enter your phone number below.</p>
          <p
            v-if="otpSendFailed"
            class="error--text"
          >
            There was a problem sending the code, please try again after 30 seconds.
          </p>
          <v-text-field
            v-model="phoneNumber"
            outlined
            label="Phone number"
            :rules="[validatePhoneNumber]"
          />
          <p>We also need your consent to contact you about the {{ item.shortName }} when you have it.</p>
          <div>
            <v-spacer />
            <v-checkbox
              v-model="consent"
              label="I consent"
              :ripple="false"
            />
          </div>
          <v-btn
            small
            depressed
            color="primary"
            :disabled="!consent || validatePhoneNumber(phoneNumber) !== true || otpSendFailed"
            :loading="sendingOtp"
            @click="sendOtp(false)"
          >
            Continue
          </v-btn>
          <v-btn
            small
            depressed
            color="secondary"
            @click="$router.replace(`/equipment/queue/${item.itemId}`)"
          >
            Cancel
          </v-btn>
        </v-stepper-content>

        <!-- Step 4 - enter code -->
        <v-stepper-step step="4" :complete="step > 4">
          Verify your phone number
        </v-stepper-step>
        <v-stepper-content step="4">
          <p>
            We've sent a six digit code to {{ phoneNumberString }}, please enter it below when you receive it.
          </p>
          <v-form ref="otpForm">
            <v-text-field
              v-model="otp"
              outlined
              label="Verification code"
              :rules="[validateOtp]"
            />
          </v-form>
          <v-btn
            small
            depressed
            color="primary"
            :disabled="validateOtp(otp) !== true || sendingOtp"
            :loading="verifyingOtp"
            @click="verifyOtp"
          >
            Continue
          </v-btn>
          <v-btn
            small
            depressed
            color="secondary"
            :disabled="verifyingOtp || tooSoonToResend"
            :loading="sendingOtp"
            @click="sendOtp(true)"
          >
            Resend
          </v-btn>
          <v-btn
            small
            depressed
            color="secondary"
            @click="$router.replace(`/equipment/queue/${item.itemId}`)"
          >
            Cancel
          </v-btn>
        </v-stepper-content>

        <!-- Step 5 - finished -->
        <v-stepper-step step="5" :complete="step > 4">
          You're in line
        </v-stepper-step>
        <v-stepper-content step="5">
          <p>
            That's it, you're in line.
          </p>
          <v-btn
            small
            depressed
            color="primary"
            @click="$router.replace(`/equipment/queue/${item.itemId}`)"
          >
            OK
          </v-btn>
        </v-stepper-content>
      </v-stepper>
    </v-card>
  </v-container>
</template>
<script>
function cleanPhoneNumber (text) {
  return text.replace(/[^\d]/g, '')
}
export default {
  async fetch () {
    const { itemId } = this.$route.params
    const [{ user, item }, { places }] = await Promise.all([
      this.$axios.$get(`/api/equipment/item/${itemId}`),
      this.$axios.$get('/api/equipment/places')
    ])
    this.user = user
    this.item = item
    this.places = places
    if (this.places.includes(this.user.location)) {
      this.city = this.user.location
    } else {
      this.city = undefined
    }
    // If they can hold equipment, skip the confirmation step
    if (this.user.canHoldEquipment) {
      this.step = 2
    }
  },
  data () {
    return {
      // Data we fetch
      user: undefined,
      item: undefined,
      places: undefined,
      // True while submitting
      submitting: false,
      // The current step
      step: 1,
      // The phone number entered
      phoneNumber: undefined,
      // Consent to receive messages
      consent: false,
      // Set to true while we are sending the OTP
      sendingOtp: false,
      // Set to true when there is a problem sending the OTP
      otpSendFailed: false,
      // If it is too soon to resend the code
      tooSoonToResend: true,
      // The otp entered in the text field
      otp: undefined,
      // While we are verifying the OTP
      verifyingOtp: false,
      // If the OTP was incorrect
      otpIncorrect: false,
      // The city entered in the location step
      city: undefined
    }
  },
  computed: {
    // Human friendly phone number
    phoneNumberString () {
      if (!this.phoneNumber) {
        return
      }
      const clean = cleanPhoneNumber(this.phoneNumber)
      return `${clean.substr(0, 3)}-${clean.substr(3, 3)}-${clean.substr(6)}`
    }
  },
  watch: {
    // When the OTP they type in changes, we reset the
    // incorrect flag
    otp () {
      this.otpIncorrect = false
    }
  },
  methods: {
    validatePhoneNumber (value) {
      if (!value) {
        return 'The phone number is required'
      }
      const digits = cleanPhoneNumber(value)
      if (digits.length !== 10) {
        return 'Please entery a valid ten digit phone number'
      }
      return true
    },
    validateOtp (value) {
      if (!value) {
        return 'The code is required'
      }
      if (this.otpIncorrect) {
        return 'That code is incorrect'
      }
      const digits = cleanPhoneNumber(value)
      if (digits.length !== 6) {
        return 'Please enter a six digit code'
      }
      return true
    },
    validateCity (value) {
      if (!value) {
        return 'Your location is required'
      }
      if (!this.places || !this.places.includes(value)) {
        return 'Invalid location'
      }
      return true
    },
    supportingMemberDate (supportingMemberDays) {
      const today = new Date()
      today.setDate(today.getDate() - supportingMemberDays)
      return today.toLocaleDateString()
    },
    async sendOtp (isResend) {
      this.sendingOtp = true
      const formData = new FormData()
      formData.set('phoneNumber', cleanPhoneNumber(this.phoneNumber))
      const url = '/api/equipment/otp'
      const { failed } = await this.$axios.$post(url, formData)
      this.sendingOtp = false
      if (failed) {
        this.otpSendFailed = true
        setTimeout(() => {
          this.otpSendFailed = false
          this.otp = '123456'
        }, 30000)
        return
      }
      // Otherwise, it was sent and we can move to the next step
      // But first, we set a timeout to enable the resend button
      this.tooSoonToResend = true
      setTimeout(() => {
        this.tooSoonToResend = false
        this.otp = '123456'
        this.verifyOtp()
      }, 35000)
      if (!isResend) {
        this.step++
      }
    },
    async verifyOtp () {
      this.verifyingOtp = true
      const formData = new FormData()
      formData.set('otp', cleanPhoneNumber(this.otp))
      formData.set('location', this.city)
      const url = `/api/equipment/queue/${this.item.itemId}`
      const { incorrect } = await this.$axios.$post(url, formData)
      this.verifyingOtp = false
      if (incorrect) {
        this.otpIncorrect = true
        this.$refs.otpForm.validate()
        return
      }
      // Final step
      this.step++
    }
  }
}
</script>
